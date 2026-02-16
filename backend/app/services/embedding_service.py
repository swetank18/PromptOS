from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from typing import List, Dict
import numpy as np
import logging

from app.core.config import settings
from app.models.conversation import Message, Conversation
from app.models.embedding import Embedding

logger = logging.getLogger(__name__)

class EmbeddingService:
    """Service for generating and managing embeddings"""
    
    def __init__(self, db: Session):
        self.db = db
        self.model = None
        self.model_name = settings.EMBEDDING_MODEL
        self.model_version = "1.0"
    
    def _load_model(self):
        """Lazy load the embedding model"""
        if self.model is None:
            logger.info(f"Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
        return self.model
    
    
    def generate_embeddings_for_conversation(self, conversation_id: str) -> Dict:
        """
        Generate embeddings for all messages in a conversation
        """
        logger.info(f"Generating embeddings for conversation {conversation_id}")
        
        # Get conversation with messages
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if not conversation:
            logger.error(f"Conversation {conversation_id} not found")
            return {"error": "Conversation not found"}
        
        generated_count = 0
        for message in conversation.messages:
            try:
                self.generate_embedding(message.id)
                generated_count += 1
            except Exception as e:
                logger.error(f"Failed to generate embedding for message {message.id}: {e}")
                
        logger.info(f"Generated {generated_count} embeddings for conversation {conversation_id}")
        
        return {
            "conversation_id": str(conversation_id),
            "embeddings_generated": generated_count,
            "total_messages": len(conversation.messages)
        }

    def generate_embedding(self, message_id: str) -> Embedding:
        """
        Generate embedding for a single message
        """
        # Get message
        message = self.db.query(Message).filter(Message.id == message_id).first()
        if not message:
            raise ValueError(f"Message {message_id} not found")
        
        # Check if embedding already exists
        existing = self.db.query(Embedding).filter(
            Embedding.message_id == message_id,
            Embedding.model_name == self.model_name,
            Embedding.model_version == self.model_version
        ).first()
        
        if existing:
            logger.info(f"Embedding already exists for message {message_id}")
            return existing
        
        # Generate embedding
        model = self._load_model()
        embedding_vector = model.encode(message.content)
        
        # Create embedding record
        embedding = Embedding(
            message_id=message_id,
            embedding=embedding_vector.tolist(),
            model_name=self.model_name,
            model_version=self.model_version
        )
        
        self.db.add(embedding)
        self.db.commit()
        self.db.refresh(embedding)
        
        logger.info(f"Generated embedding for message {message_id}")
        
        return embedding
    
    def batch_generate_embeddings(self, message_ids: List[str]) -> Dict:
        """
        Batch generate embeddings for multiple messages
        More efficient than individual generation
        """
        # Get messages
        messages = self.db.query(Message).filter(
            Message.id.in_(message_ids)
        ).all()
        
        if not messages:
            return {"success": 0, "failed": 0, "skipped": 0}
        
        # Filter out messages that already have embeddings
        existing_message_ids = set(
            e.message_id for e in self.db.query(Embedding.message_id).filter(
                Embedding.message_id.in_(message_ids),
                Embedding.model_name == self.model_name,
                Embedding.model_version == self.model_version
            ).all()
        )
        
        messages_to_process = [
            m for m in messages if m.id not in existing_message_ids
        ]
        
        if not messages_to_process:
            logger.info("All messages already have embeddings")
            return {
                "success": 0,
                "failed": 0,
                "skipped": len(messages)
            }
        
        # Batch encode
        model = self._load_model()
        contents = [m.content for m in messages_to_process]
        
        try:
            embedding_vectors = model.encode(contents, show_progress_bar=False)
            
            # Create embedding records
            embeddings = []
            for message, vector in zip(messages_to_process, embedding_vectors):
                embedding = Embedding(
                    message_id=message.id,
                    embedding=vector.tolist(),
                    model_name=self.model_name,
                    model_version=self.model_version
                )
                embeddings.append(embedding)
            
            self.db.bulk_save_objects(embeddings)
            self.db.commit()
            
            logger.info(f"Batch generated {len(embeddings)} embeddings")
            
            return {
                "success": len(embeddings),
                "failed": 0,
                "skipped": len(existing_message_ids)
            }
            
        except Exception as e:
            logger.error(f"Batch embedding generation failed: {e}")
            self.db.rollback()
            return {
                "success": 0,
                "failed": len(messages_to_process),
                "skipped": len(existing_message_ids)
            }
    
    def search_similar(
        self,
        query: str,
        user_id: str,
        limit: int = 20,
        threshold: float = 0.5
    ) -> List[Dict]:
        """
        Search for similar messages using vector similarity
        """
        # Generate query embedding
        model = self._load_model()
        query_vector = model.encode(query)
        
        # SQL query with pgvector
        # Using cosine distance: 1 - (embedding <=> query_vector)
        sql = """
        SELECT 
            m.id as message_id,
            m.content,
            m.role,
            c.id as conversation_id,
            c.title,
            a.display_name as agent_name,
            1 - (e.embedding <=> :query_vector) as similarity
        FROM messages m
        JOIN embeddings e ON e.message_id = m.id
        JOIN conversations c ON c.id = m.conversation_id
        JOIN agents a ON a.id = c.agent_id
        WHERE c.user_id = :user_id
            AND c.is_deleted = false
            AND 1 - (e.embedding <=> :query_vector) > :threshold
        ORDER BY similarity DESC
        LIMIT :limit
        """
        
        results = self.db.execute(
            sql,
            {
                "user_id": user_id,
                "query_vector": query_vector.tolist(),
                "threshold": threshold,
                "limit": limit
            }
        ).fetchall()
        
        return [
            {
                "message_id": str(r.message_id),
                "content": r.content,
                "role": r.role,
                "conversation_id": str(r.conversation_id),
                "conversation_title": r.title,
                "agent_name": r.agent_name,
                "similarity": float(r.similarity)
            }
            for r in results
        ]
