import os
import chromadb
from dotenv import load_dotenv

load_dotenv()

client = chromadb.PersistentClient(path=os.getenv("CHROMA_PATH", "./chroma_store"))


def _collection_name(user_id: str) -> str:
    # ChromaDB requires collection names of 3-512 chars, so namespace the raw id
    return f"user_{user_id}"


def get_or_create_collection(user_id: str):
    return client.get_or_create_collection(
        name=_collection_name(user_id),
        metadata={"hnsw:space": "cosine"},
    )


def clear_collection(user_id: str):
    try:
        client.delete_collection(name=_collection_name(user_id))
    except Exception:
        pass  # collection may not exist yet on first ingest — that's fine


def add_documents(user_id: str, posts: list, embeddings: list):
    collection = get_or_create_collection(user_id)

    ids = [post.id for post in posts]

    documents = [
        " ".join(f'{k} {post.id} "{v}"' for k, v in post.properties.items())
        for post in posts
    ]

    # 'metadatas' stores the structured properties dict for retrieval context
    metadatas = [post.properties for post in posts]

    collection.add(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
    )


def search(user_id: str, query_embedding: list, top_k: int = 5) -> dict:
    collection = get_or_create_collection(user_id)
    return collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )
