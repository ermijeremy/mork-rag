from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import psycopg
from db import get_db
from services import session_service
from dependencies import create_access_token

router = APIRouter()

class AuthRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
async def login(body: AuthRequest, 
    conn: psycopg.AsyncConnection = Depends(get_db)):
    try:
        user = await session_service.login(body.username, body.password, conn)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    token = create_access_token({"sub":user["username"],
    "user_id":user["id"]})
    return {"token":token, "username":user["username"],"userId":user["id"]}

@router.post("/register")
async def register(body: AuthRequest,
    conn: psycopg.AsyncConnection = Depends(get_db)):

    try:
        user = await session_service.register(body.username, body.password, conn)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    token = create_access_token({"sub": user["username"], "user_id": user["id"]})

    return {"token": token, "username": user["username"], "userId": user["id"]}
