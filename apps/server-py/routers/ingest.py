import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
import psycopg
from db import get_db
from dependencies import get_current_user
from services import chat_service

router = APIRouter()
DATA_PATH = os.getenv("DATA_PATH", "../../data/data.metta")

@router.post("/ingest")
async def ingest(
    file: UploadFile = File(None),
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db)
):
    data_path = os.path.abspath(DATA_PATH)

    if file:
        contents = await file.read()
        with open(data_path, "wb") as f:
            f.write(contents)
    
    try:
        result = await chat_service.ingest_data(str(current_user["id"]), data_path)
        return {"success": True, "message": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))