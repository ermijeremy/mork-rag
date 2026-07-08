FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.hf_cache

WORKDIR /app

# Build tooling for any packages without prebuilt wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Bake the embedding model into the image so the first request is fast and
# the container does not need to reach Hugging Face at runtime.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .

EXPOSE 8000
# Bind IPv6 (::) so Railway's private network (railway.internal) can reach it;
# on Linux this dual-stacks and also accepts IPv4. Shell form so ${PORT} from
# Railway expands, defaulting to 8000 for local runs.
CMD ["sh", "-c", "uvicorn main:app --host :: --port ${PORT:-8000}"]
