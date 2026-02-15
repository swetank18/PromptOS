from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.search import SearchRequest, SearchResponse, SearchResult
from app.services.embedding_service import EmbeddingService

router = APIRouter()

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
