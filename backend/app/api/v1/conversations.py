from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.conversation import Conversation, Message
from app.schemas.conversation import (
    ConversationCreate,
    ConversationResponse,
    ConversationListResponse,
    ConversationUpdate,
    ConversationBatchCreate,
    ConversationBatchResponse,
    MessageResponse
)
from app.tasks.embedding_tasks import generate_embeddings_task

router = APIRouter()

@router.post("/", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ConversationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new conversation with messages
    """
    # Create conversation
    conversation = Conversation(
        user_id=current_user.id,
        agent_id=conversation_data.agent_id,
        project_id=conversation_data.project_id,
        external_id=conversation_data.external_id,
        title=conversation_data.title or "Untitled Conversation",
        metadata=conversation_data.metadata or {},
        message_count=len(conversation_data.messages)
    )
    
    db.add(conversation)
    db.flush()  # Get conversation ID
    
    # Add messages
    messages = []
    for msg_data in conversation_data.messages:
        message = Message(
            conversation_id=conversation.id,
            role=msg_data.role,
            content=msg_data.content,
            sequence_number=msg_data.sequence_number,
            external_id=msg_data.external_id,
            model=msg_data.model,
            tokens=msg_data.tokens,
            metadata=msg_data.metadata or {}
        )
        messages.append(message)
    
    db.bulk_save_objects(messages)
    db.commit()
    db.refresh(conversation)
    
    # Trigger background embedding generation
    background_tasks.add_task(
        lambda: generate_embeddings_task.delay(str(conversation.id))
    )
    
    # Load messages for response
    conversation.messages = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.sequence_number).all()
    
    return conversation

@router.post("/batch", response_model=ConversationBatchResponse)
async def batch_create_conversations(
    batch_data: ConversationBatchCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Batch create conversations (for extension sync)
    Deduplicates based on external_id
    """
    created_conversations = []
    created_count = 0
    updated_count = 0
    failed_count = 0
    
    for conv_data in batch_data.conversations:
        try:
            # Check if conversation already exists
            existing = None
            if conv_data.external_id:
                existing = db.query(Conversation).filter(
                    Conversation.user_id == current_user.id,
                    Conversation.agent_id == conv_data.agent_id,
                    Conversation.external_id == conv_data.external_id
                ).first()
            
            if existing:
                # Update existing conversation
                existing.title = conv_data.title or existing.title
                existing.project_id = conv_data.project_id or existing.project_id
                existing.metadata = {**existing.metadata, **(conv_data.metadata or {})}
                
                # Check for new messages
                existing_msg_count = db.query(Message).filter(
                    Message.conversation_id == existing.id
                ).count()
                
                if len(conv_data.messages) > existing_msg_count:
                    # Add new messages
                    for msg_data in conv_data.messages[existing_msg_count:]:
                        message = Message(
                            conversation_id=existing.id,
                            role=msg_data.role,
                            content=msg_data.content,
                            sequence_number=msg_data.sequence_number,
                            external_id=msg_data.external_id,
                            model=msg_data.model,
                            tokens=msg_data.tokens,
                            metadata=msg_data.metadata or {}
                        )
                        db.add(message)
                    
                    existing.message_count = len(conv_data.messages)
                
                db.commit()
                db.refresh(existing)
                created_conversations.append(existing)
                updated_count += 1
                
            else:
                # Create new conversation
                conversation = Conversation(
                    user_id=current_user.id,
                    agent_id=conv_data.agent_id,
                    project_id=conv_data.project_id,
                    external_id=conv_data.external_id,
                    title=conv_data.title or "Untitled Conversation",
                    metadata=conv_data.metadata or {},
                    message_count=len(conv_data.messages)
                )
                
                db.add(conversation)
                db.flush()
                
                # Add messages
                for msg_data in conv_data.messages:
                    message = Message(
                        conversation_id=conversation.id,
                        role=msg_data.role,
                        content=msg_data.content,
                        sequence_number=msg_data.sequence_number,
                        external_id=msg_data.external_id,
                        model=msg_data.model,
                        tokens=msg_data.tokens,
                        metadata=msg_data.metadata or {}
                    )
                    db.add(message)
                
                db.commit()
                db.refresh(conversation)
                created_conversations.append(conversation)
                created_count += 1
                
                # Trigger embedding generation
                background_tasks.add_task(
                    lambda cid=str(conversation.id): generate_embeddings_task.delay(cid)
                )
                
        except Exception as e:
            print(f"Failed to process conversation: {e}")
            failed_count += 1
            continue
    
    return ConversationBatchResponse(
        created=created_count,
        updated=updated_count,
        failed=failed_count,
        conversations=created_conversations
    )

@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get conversation by ID with all messages
    """
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
        Conversation.is_deleted == False
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Load messages
    conversation.messages = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.sequence_number).all()
    
    return conversation

@router.get("/", response_model=List[ConversationListResponse])
async def list_conversations(
    project_id: Optional[UUID] = None,
    agent_id: Optional[UUID] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List conversations with filtering
    """
    query = db.query(Conversation).filter(
        Conversation.user_id == current_user.id,
        Conversation.is_deleted == False
    )
    
    if project_id:
        query = query.filter(Conversation.project_id == project_id)
    
    if agent_id:
        query = query.filter(Conversation.agent_id == agent_id)
    
    conversations = query.order_by(
        Conversation.created_at.desc()
    ).limit(limit).offset(offset).all()
    
    return conversations

@router.put("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: UUID,
    update_data: ConversationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update conversation
    """
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Update fields
    if update_data.title is not None:
        conversation.title = update_data.title
    if update_data.project_id is not None:
        conversation.project_id = update_data.project_id
    if update_data.is_archived is not None:
        conversation.is_archived = update_data.is_archived
    
    db.commit()
    db.refresh(conversation)
    
    return conversation

@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID,
    hard_delete: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete conversation (soft delete by default)
    """
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    if hard_delete:
        db.delete(conversation)
    else:
        from datetime import datetime
        conversation.is_deleted = True
        conversation.deleted_at = datetime.utcnow()
    
    db.commit()
    
    return None
