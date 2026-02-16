from celery import Task
from sqlalchemy.orm import Session
import logging

from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.embedding_service import EmbeddingService
from app.models.conversation import Conversation, Message

logger = logging.getLogger(__name__)

class DatabaseTask(Task):
    """Base task with database session"""
    _db = None

    @property
    def db(self) -> Session:
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None

@celery_app.task(base=DatabaseTask, bind=True)
def generate_embeddings_task(self, conversation_id: str):
    """
    Generate embeddings for all messages in a conversation
    """
    logger.info(f"Generating embeddings for conversation {conversation_id}")
    
    try:
        # Get conversation with messages
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if not conversation:
            logger.error(f"Conversation {conversation_id} not found")
            return {"error": "Conversation not found"}
        
        # Initialize embedding service
        embedding_service = EmbeddingService(self.db)
        
        # Generate embeddings for each message
        generated_count = 0
        for message in conversation.messages:
            try:
                embedding_service.generate_embedding(message.id)
                generated_count += 1
            except Exception as e:
                logger.error(f"Failed to generate embedding for message {message.id}: {e}")
        
        logger.info(f"Generated {generated_count} embeddings for conversation {conversation_id}")
        
        return {
            "conversation_id": str(conversation_id),
            "embeddings_generated": generated_count,
            "total_messages": len(conversation.messages)
        }
        
    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        raise

@celery_app.task(base=DatabaseTask, bind=True)
def batch_generate_embeddings_task(self, message_ids: list):
    """
    Batch generate embeddings for multiple messages
    More efficient for bulk operations
    """
    logger.info(f"Batch generating embeddings for {len(message_ids)} messages")
    
    try:
        embedding_service = EmbeddingService(self.db)
        
        # Batch process
        results = embedding_service.batch_generate_embeddings(message_ids)
        
        logger.info(f"Batch generated {results['success']} embeddings")
        
        return results
        
    except Exception as e:
        logger.error(f"Error in batch embedding generation: {e}")
        raise

@celery_app.task(base=DatabaseTask, bind=True)
def cleanup_old_embeddings_task(self, days: int = 90):
    """
    Clean up embeddings for deleted conversations
    """
    logger.info(f"Cleaning up embeddings older than {days} days")
    
    try:
        from datetime import datetime, timedelta
        from app.models.embedding import Embedding

        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Find messages from deleted conversations
        deleted_messages = self.db.query(Message).join(Conversation).filter(
            Conversation.is_deleted == True,
            Conversation.deleted_at < cutoff_date
        ).all()

        # Delete embeddings
        deleted_count = 0
        for message in deleted_messages:
            self.db.query(Embedding).filter(
                Embedding.message_id == message.id
            ).delete()
            deleted_count += 1

        self.db.commit()
        logger.info(f"Cleaned up {deleted_count} embeddings")
        return {"deleted_count": deleted_count}

    except Exception as e:
        logger.error(f"Error cleaning up embeddings: {e}")
        self.db.rollback()
        raise

def run_sync_embeddings(conversation_id: str):
    """
    Run embedding generation synchronously (in-process)
    Used when Celery is not available (e.g. free tier)
    """
    db = SessionLocal()
    try:
        service = EmbeddingService(db)
        service.generate_embeddings_for_conversation(conversation_id)
    except Exception as e:
        logger.error(f"Error in sync embedding generation: {e}")
    finally:
        db.close()
