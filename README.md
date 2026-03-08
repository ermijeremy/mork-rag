# Mork RAG Demo

A fullstack service demonstrating the capabilities of the Mork Typescript SDK for MeTTa-based knowledge graph operations. This application manages interactions with a MeTTa knowledge base, providing a Retrieval-Augmented Generation (RAG) chat interface and visualizing graph structures.

## Features

- **Interactive Chat Interface**: Communicate with an AI assistant augmented by custom knowledge base.
- **RAG Implementation**: Utilizes the Mork SDK to retrieve relevant context from `.metta` data files to enhance LLM responses.
- **Persistent Sessions**: Secure login and session management backed by PostgreSQL. Chat history is saved per user, allowing to pick up where you left off.
- **Graph Visualization**: Visualizes the chat history and relationship nodes using interactive graphs.
- **Data Ingestion**: Ability to ingest MeTTa data and rules directly into the **Mork engine**.
- **History Branching**: Support for branching conversations (replying to previous messages in the history tree).

## Mork DB & SDK Integration

This project leverages **Mork DB** as the central knowledge store for the RAG pipeline. It uniquely stores both the **raw facts** (MeTTa expressions) and their computed **vector embeddings** within the same graph structure.

### Role of Mork DB
1.  **Fact Storage**: Parses `.metta` data files and uploads them into Mork, preserving the graph relationships defined in the MeTTa language.
2.  **Embedding Storage**: Stores vector embeddings as explicit facts `(embed <node_id> <index> <value>)`, allowing the knowledge graph to hold its own semantic representation.
3.  **Retrieval**:
    - Fetches embedding vectors to perform cosine similarity searches.
    - Retrieves the actual fact content for top-ranked results to provide context to the LLM.

### Mork TypeScript SDK Usage

The application uses the `mork-ts-sdk` to interact with the Mork engine. You can install it via:

```bash
npm install mork-ts-sdk
```

Key API endpoints and requests used in this project:

- **`MorkApiClient`**: The main entry point for connecting to the Mork instance.
- **`UploadRequest`**: Used to ingest facts and embedding tuples into the graph.
  ```typescript
  // Example: Uploading embeddings
  const req = new UploadRequest();
  req.dataVal = "(embed node_1 0 0.123)";
  await client.dispatch(req);
  ```
- **`ExportRequest`**: Used for retrieving data using pattern matching.
  ```typescript
  // Example: retrieving facts by ID
  const req = new ExportRequest();
  req.patternVal = "($x node_1 $y)";
  const result = await client.dispatch(req);
  ```
- **`ClearRequest`**: Utility to reset the knowledge graph state before fresh ingestion.

## Prerequisites

Before running the project, ensure you have the following installed:

- Node.js (v18 or higher)
- pnpm (recommended) or npm
- PostgreSQL Database
- Access to a running [Mork](https://github.com/trueagi-io/MORK/tree/server) instance
- Mistral AI API Key

## Getting Started

### 1. Installation

Clone the repository and install dependencies from the root directory:

```bash
pnpm install
```

### 2. Database Setup

Ensure your PostgreSQL server is running and create a database for the project (e.g., `mork_rag`).

The application will automatically create the necessary tables (`sessions`, `chat_nodes`) on startup if they don't exist.

### 3. Server Configuration

Navigate to the server directory and set up your environment variables:

```bash
cd apps/server
cp .env.example .env
```

Edit the `.env` file with your credentials:

```env
MORK_URL=http://localhost:8080
MISTRAL_API_URL=https://api.mistral.ai/v1
MISTRAL_API_KEY=your_mistral_api_key
DATA_PATH=../../data/data.metta
DATABASE_URL=postgresql://user:password@localhost:5432/mork_rag
```

### 4. Running the Application

You can run the client and server separately.

**Start the Server:**

```bash
# In apps/server
pnpm dev
```
The server will start on `http://localhost:3000`.

**Start the Client:**

```bash
# In apps/client
pnpm dev
```
The client will start on `http://localhost:5173`.

## Project Structure

```
├── apps
│   ├── client          # React frontend application
│   └── server          # Hono backend API
├── data                # Sample .metta data and rules
└── package.json        # Workspace configuration
```

## Usage

1. Open the client in your browser.
2. Enter a username to log in (accounts are created automatically on first login).
3. Chat with the bot. The bot will use context from the `data/data.metta` file if ingested.
4. View the "Graph" tab to see the visualization of your conversation history.
