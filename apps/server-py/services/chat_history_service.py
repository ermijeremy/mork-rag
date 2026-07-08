import psycopg

# create chat nodes table to store history graph
async def init(conn: psycopg.AsyncConnection):
    await conn.execute("""        
        CREATE TABLE IF NOT EXISTS chat_nodes (
        id SERIAL PRIMARY KEY,
        session_id TEXT,
        parent_id INTEGER REFERENCES chat_nodes(id) ON DELETE SET NULL,
        username TEXT, 
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        created_at DATE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    await conn.commit()

async def add_node(
    conn: psycopg.AsyncConnection, 
    session_id: str,
    username: str,
    user_message: str,
    ai_response: str,
    parent_id: int | None = None,
    ) -> int:
    cur = await conn.execute(
        """INSERT INTO chat_nodes (session_id, username, user_message,
        ai_response, parent_id) VALUES (%s, %s, %s, %s, %s) RETURNING id""",
        (session_id, username, user_message, ai_response, parent_id),
    )

    row = await cur.fetchone()
    await conn.commit()
    return row[0]

async def get_patch(conn: psycopg.AsyncConnection, node_id:int) -> list[dict]:
    cur = await conn.execute("""
        WITH RECURSIVE path AS (
            SELECT id, parent_id, username, user_message,
            ai_response, created_at FROM chat_nodes WHERE
            id=%s UNION ALL SELECT cn.id, cn.parent_id, cn.username,
            cn.user_message, cn.ai_response, cn.created_at FROM chat_nodes cn
            JOIN path p ON p.parent_id=cn.id
        )
        SELECT id, parent_id, username, user_message, ai_response,
        created_at FROM path ORDER BY created_at ASC;""",
        (node_id,))

    rows = await cur.fetchall()
    return [
        {"id":r[0], "parent_id":r[1], "username":r[2],
        "user_message":r[3], "ai_response":r[4], "created_at":r[5]}
        for r in rows
    ]

async def get_graph(conn: psycopg.AsyncConnection, username: str) -> list[dict]:
    cur =  await conn.execute(
        """SELECT id, parent_id, username, user_message, ai_response,
        created_at FROM chat_nodes WHERE username=%s ORDER BY created_at ASC
        """,
        (username,),
    )

    rows = await cur.fetchall()
    return [
        {"id":r[0], "parent_id":r[1], "username":r[2],
        "user_message":r[3], "ai_response":r[4], "created_at":r[5]}
        for r in rows
    ]

async def delete_branch(conn: psycopg.AsyncConnection, node_id: int, username: str):
    cur = await conn.execute(
        """WITH RECURSIVE descendants AS (
            SELECT id FROM chat_nodes WHERE id = %s AND username = %s
            UNION ALL
            SELECT cn.id FROM chat_nodes cn
            INNER JOIN descendants d ON cn.parent_id = d.id
        )
        DELETE FROM chat_nodes WHERE id IN (SELECT id FROM descendants);
        """,
        (node_id,username)
    )

    await conn.commit()