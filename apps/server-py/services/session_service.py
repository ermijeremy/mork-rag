from fastapi import HTTPException
from passlib.context import CryptContext
import psycopg


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def init(conn: psycopg.AsyncConnection):
    await conn.execute("""CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        ); """)
    await conn.commit()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hash: str) -> bool:
    return pwd_context.verify(password, hash)

async def login(username: str, password: str, conn: psycopg.AsyncConnection) -> dict:
    cur = await conn.execute(
        """SELECT id, username, password_hash FROM users WHERE username=%s""",
        (username,),
    )
    row = await cur.fetchone()

    if not row:
        raise ValueError("User not found")

    if not verify_password(password, row[2]):
        raise ValueError("Invalid credentials")

    return {"id": row[0], "username": row[1]}

async def register(username: str, password: str, conn: psycopg.AsyncConnection) -> dict:
    cur = await conn.execute("""SELECT id FROM users WHERE username=%s""", (username,))
    usr = await cur.fetchone()

    if usr:
        raise ValueError("User already registered")

    cur = await conn.execute(
        """INSERT INTO users (username, password_hash)
        VALUES (%s, %s) RETURNING id, username""",
        (username, hash_password(password)),
    )
    row = await cur.fetchone()
    await conn.commit()

    return {"id": row[0], "username": row[1]}
