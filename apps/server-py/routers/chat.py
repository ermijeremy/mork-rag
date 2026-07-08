from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import psycopg
from db import get_db
from dependencies import get_current_user
from services import chat_history_service, chat_service

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    parentId: int | None = None
    provider: str | None = None
    apikey: str | None = None

@router.post("/chat")
async def chat(
    body: ChatRequest,
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db)
):
    history_context = ""
    if body.parentId:
        path = await chat_history_service.get_patch(conn, body.parentId)
        history_context = "\n---\n".join(f"User: {n['user_message']}\nAssistant: {n['ai_response']}" for n in path)

    try:
        result = await chat_service.chat(message=body.message, history_context=history_context, user_id=str(current_user['id']),
                    provider="", api_key=body.apikey)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    node_id = await chat_history_service.add_node(conn=conn, session_id=current_user['token'], username=current_user['username'], 
            user_message=body.message, ai_response=result['response'], parent_id=body.parentId)

    return {
        "response": result["response"],
        "nodeId": node_id,
        "parentId": body.parentId,
        "debug": result["debug"]
    }

@router.get("/chat/graph")
async def get_graph(
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db)
):
    graph = await chat_history_service.get_graph(conn, current_user['username'])
    return {"graph": graph}

@router.delete("/chat/graph/{node_id}")
async def delete_branch(
    node_id: int,
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db)
):
    await chat_history_service.delete_branch(conn, node_id, current_user['username'])
    return {"success": True}