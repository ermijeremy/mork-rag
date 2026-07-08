import os
from dotenv import load_dotenv
load_dotenv()

import psycopg


async def get_db():
    db_params = {
        "host": os.getenv("DATABASE_HOST"),
        "dbname": os.getenv("DATABASE_NAME"),
        "user": os.getenv("DATABASE_USER"),
        "password": os.getenv("DATABASE_PASSWORD"),
        "port": os.getenv("DATABASE_PORT")
    }

    conn = await psycopg.AsyncConnection.connect(**db_params)
    try:
        yield conn
    finally:
        await conn.close()
