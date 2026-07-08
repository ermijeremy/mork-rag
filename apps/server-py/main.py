import os
import psycopg
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, chat, ingest
from services import session_service, chat_history_service

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    conn = await psycopg.AsyncConnection.connect(
        host=os.getenv("DATABASE_HOST"),
        dbname=os.getenv("DATABASE_NAME"),
        user=os.getenv("DATABASE_USER"),
        password=os.getenv("DATABASE_PASSWORD"),
        port=os.getenv("DATABASE_PORT"),
    )

    try:
        await session_service.init(conn)
        await chat_history_service.init(conn)
    finally:
        await conn.close()

    yield

app = FastAPI(lifespan=lifespan, title="Mork RAG API")

# Comma-separated allowlist of frontend origins. A "*" wildcard is intentionally
# not used because it is invalid in combination with allow_credentials=True.
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")