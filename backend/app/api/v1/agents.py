from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.conversation import Agent
from pydantic import BaseModel
from uuid import UUID
from typing import Dict, Any

router = APIRouter()

class AgentResponse(BaseModel):
    id: UUID
    name: str
    display_name: str
    metadata: Dict[str, Any]
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[AgentResponse])
async def list_agents(db: Session = Depends(get_db)):
    """
    List all available AI agents/platforms
    """
    agents = db.query(Agent).all()
    return agents

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: UUID, db: Session = Depends(get_db)):
    """
    Get agent details by ID
    """
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    return agent
