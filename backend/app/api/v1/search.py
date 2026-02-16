from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import numpy as np

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.conversation import Conversation, Message
from app.models.embedding import Embedding
from app.schemas.search import (
    SearchRequest,
    SearchResponse,
    SearchResult,
    ConversationCompareRequest,
    ConversationCompareResponse,
    TurnSimilarityResult,
)
from app.services.embedding_service import EmbeddingService

router = APIRouter()


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    left_arr = np.array(left, dtype=np.float32)
    right_arr = np.array(right, dtype=np.float32)
    left_norm = np.linalg.norm(left_arr)
    right_norm = np.linalg.norm(right_arr)
    if left_norm == 0.0 or right_norm == 0.0:
        return 0.0
    return float(np.dot(left_arr, right_arr) / (left_norm * right_norm))

@router.post("/semantic", response_model=SearchResponse)
async def semantic_search(
    request: SearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Semantic search using vector embeddings
    """
    embedding_service = EmbeddingService(db)
    
    results = embedding_service.search_similar(
        query=request.query,
        user_id=str(current_user.id),
        limit=request.limit,
        threshold=request.similarity_threshold
    )
    
    search_results = [
        SearchResult(
            message_id=r["message_id"],
            content=r["content"],
            role=r["role"],
            conversation_id=r["conversation_id"],
            conversation_title=r["conversation_title"],
            agent_name=r["agent_name"],
            similarity=r["similarity"]
        )
        for r in results
    ]
    
    return SearchResponse(
        query=request.query,
        results=search_results,
        total=len(search_results),
        search_type="semantic"
    )

@router.post("/keyword", response_model=SearchResponse)
async def keyword_search(
    request: SearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Full-text keyword search using PostgreSQL FTS
    """
    from app.models.conversation import Message, Conversation
    from app.models.user import User as UserModel
    from sqlalchemy import func, or_
    
    # Build query
    query = db.query(
        Message.id.label("message_id"),
        Message.content,
        Message.role,
        Conversation.id.label("conversation_id"),
        Conversation.title.label("conversation_title"),
        func.coalesce(Conversation.metadata['source'].astext, 'unknown').label("agent_name")
    ).join(
        Conversation, Message.conversation_id == Conversation.id
    ).filter(
        Conversation.user_id == current_user.id,
        Conversation.is_deleted == False
    )
    
    # Add full-text search
    search_vector = func.to_tsvector('english', Message.content)
    search_query = func.plainto_tsquery('english', request.query)
    query = query.filter(search_vector.op('@@')(search_query))
    
    # Apply filters
    if request.project_ids:
        query = query.filter(Conversation.project_id.in_(request.project_ids))
    
    if request.agent_ids:
        query = query.filter(Conversation.agent_id.in_(request.agent_ids))
    
    # Execute
    results = query.limit(request.limit).all()
    
    search_results = [
        SearchResult(
            message_id=r.message_id,
            content=r.content,
            role=r.role,
            conversation_id=r.conversation_id,
            conversation_title=r.conversation_title,
            agent_name=r.agent_name,
            similarity=None
        )
        for r in results
    ]
    
    return SearchResponse(
        query=request.query,
        results=search_results,
        total=len(search_results),
        search_type="keyword"
    )

@router.post("/hybrid", response_model=SearchResponse)
async def hybrid_search(
    request: SearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Hybrid search combining semantic + keyword with RRF
    """
    # Get semantic results
    embedding_service = EmbeddingService(db)
    semantic_results = embedding_service.search_similar(
        query=request.query,
        user_id=str(current_user.id),
        limit=request.limit * 2,  # Get more for merging
        threshold=request.similarity_threshold
    )
    
    # Get keyword results
    from app.models.conversation import Message, Conversation
    from sqlalchemy import func
    
    query = db.query(
        Message.id.label("message_id"),
        Message.content,
        Message.role,
        Conversation.id.label("conversation_id"),
        Conversation.title.label("conversation_title"),
        func.coalesce(Conversation.metadata['source'].astext, 'unknown').label("agent_name")
    ).join(
        Conversation, Message.conversation_id == Conversation.id
    ).filter(
        Conversation.user_id == current_user.id,
        Conversation.is_deleted == False
    )
    
    search_vector = func.to_tsvector('english', Message.content)
    search_query = func.plainto_tsquery('english', request.query)
    query = query.filter(search_vector.op('@@')(search_query))
    
    keyword_results = query.limit(request.limit * 2).all()
    
    # Reciprocal Rank Fusion (RRF)
    k = 60  # RRF constant
    scores = {}
    
    # Score semantic results
    for rank, result in enumerate(semantic_results, 1):
        msg_id = result["message_id"]
        scores[msg_id] = scores.get(msg_id, 0) + 1 / (k + rank)
    
    # Score keyword results
    for rank, result in enumerate(keyword_results, 1):
        msg_id = str(result.message_id)
        scores[msg_id] = scores.get(msg_id, 0) + 1 / (k + rank)
    
    # Sort by combined score
    sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)[:request.limit]
    
    # Build final results
    result_map = {r["message_id"]: r for r in semantic_results}
    for r in keyword_results:
        if str(r.message_id) not in result_map:
            result_map[str(r.message_id)] = {
                "message_id": str(r.message_id),
                "content": r.content,
                "role": r.role,
                "conversation_id": str(r.conversation_id),
                "conversation_title": r.conversation_title,
                "agent_name": r.agent_name,
                "similarity": None
            }
    
    final_results = [
        SearchResult(**result_map[msg_id])
        for msg_id in sorted_ids
        if msg_id in result_map
    ]
    
    return SearchResponse(
        query=request.query,
        results=final_results,
        total=len(final_results),
        search_type="hybrid"
    )


@router.post("/compare/conversations", response_model=ConversationCompareResponse)
async def compare_conversations(
    request: ConversationCompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    left = db.query(Conversation).filter(
        Conversation.id == request.left_conversation_id,
        Conversation.user_id == current_user.id,
        Conversation.is_deleted == False,
    ).first()
    right = db.query(Conversation).filter(
        Conversation.id == request.right_conversation_id,
        Conversation.user_id == current_user.id,
        Conversation.is_deleted == False,
    ).first()

    if not left or not right:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both conversations were not found",
        )

    max_turns = max(1, min(int(request.max_turns), 100))

    left_messages = db.query(Message).filter(
        Message.conversation_id == left.id,
        Message.role == "assistant",
    ).order_by(Message.sequence_number.asc()).limit(max_turns).all()

    right_messages = db.query(Message).filter(
        Message.conversation_id == right.id,
        Message.role == "assistant",
    ).order_by(Message.sequence_number.asc()).limit(max_turns).all()

    turns = min(len(left_messages), len(right_messages))
    if turns == 0:
        return ConversationCompareResponse(
            left_conversation_id=left.id,
            right_conversation_id=right.id,
            compared_turns=0,
            comparable_turns=0,
            average_similarity=None,
            turn_results=[],
        )

    message_ids = [m.id for m in left_messages[:turns]] + [m.id for m in right_messages[:turns]]
    embedding_rows = db.query(Embedding).filter(Embedding.message_id.in_(message_ids)).all()
    embedding_by_message = {row.message_id: row.embedding for row in embedding_rows}

    turn_results: list[TurnSimilarityResult] = []
    comparable_scores: list[float] = []
    for idx in range(turns):
        left_msg = left_messages[idx]
        right_msg = right_messages[idx]
        left_embedding = embedding_by_message.get(left_msg.id)
        right_embedding = embedding_by_message.get(right_msg.id)

        has_left = left_embedding is not None
        has_right = right_embedding is not None
        similarity = None
        if has_left and has_right:
            similarity = _cosine_similarity(left_embedding, right_embedding)
            comparable_scores.append(similarity)

        turn_results.append(
            TurnSimilarityResult(
                turn_index=idx + 1,
                left_message_id=left_msg.id,
                right_message_id=right_msg.id,
                left_preview=left_msg.content[:220],
                right_preview=right_msg.content[:220],
                similarity=similarity,
                has_left_embedding=has_left,
                has_right_embedding=has_right,
            )
        )

    avg_similarity = None
    if comparable_scores:
        avg_similarity = float(sum(comparable_scores) / len(comparable_scores))

    return ConversationCompareResponse(
        left_conversation_id=left.id,
        right_conversation_id=right.id,
        compared_turns=turns,
        comparable_turns=len(comparable_scores),
        average_similarity=avg_similarity,
        turn_results=turn_results,
    )
