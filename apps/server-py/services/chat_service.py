import os
import httpx
from dotenv import load_dotenv
from services import embedding_service, chromadb_service
from services.metta_parser import parse, to_embedding_string

load_dotenv()

MISTRAL_URL = os.getenv("MISTRAL_API_URL",
"https://api.mistral.ai/v1")
MISTRAL_KEY = os.getenv("MISTRAL_API_KEY", "")


async def ingest_data(user_id: str, file_path: str) -> str:
    posts = parse(file_path)
    chromadb_service.clear_collection(user_id)

    embeddings = [embedding_service.embed(to_embedding_string(p)) for p in posts]
    chromadb_service.add_documents(user_id, posts, embeddings)

    return f"Ingested {len(posts)} posts into namespace {user_id}."

async def retrieve(user_id: str, query: str, top_k: int = 5) -> dict:
    query_embedding = embedding_service.embed(query)
    results = chromadb_service.search(user_id, query_embedding, top_k)

    return {
        "results": results,
        "debug": {
            "query": query, 
            "top_documents": results.get("documents", [[]])[0]
        },
    }

async def chat(
    message: str,
    history_context: str,
    user_id: str,
    provider: str | None = None,
    api_key: str | None = None,
) -> dict:
    retrieval = await retrieve(user_id, message)
    documents = retrieval["results"].get("documents", [[]])[0]
    context_str = "\n---\n".join(documents)

    system_prompt = (
        "You are an intelligent assistant. The provided context contains specific posts. "
        "Synthesize the information to answer the user's question. "
        "Use context only if relevant; otherwise answer directly."
    )

    user_prompt = f"Context:\n{context_str}\n\n"

    if history_context:
        user_prompt += f"Conversation History:\n{history_context}\n\n"
    
    user_prompt += f"Question: {message}\nAnswer:"

    messages = [
        {"role":"system", "content":system_prompt},
        {"role":"user", "content":user_prompt}
    ]

    async with httpx.AsyncClient(timeout=200) as client:
        if provider == "openai":
            key = api_key or os.getenv("OPENAI_API_KEY", "")
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization":f"Bearer {key}"},
                json={"model":"gpt-3.5-turbo", "messages": messages},
            )

        else:
            key = api_key or MISTRAL_KEY
            resp = await client.post(
                f"{MISTRAL_URL}/chat/completions",
                headers={"Authorization": f"Bearer {key}"},
                json={"model":"mistral-tiny", "messages":messages},
            )
        
    resp.raise_for_status()
    text = resp.json()["choices"][0]["message"]["content"]
    return {"response": text, "debug": retrieval["debug"]}