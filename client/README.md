# Dabber MCP Client

The Dabber Client is a Next.js frontend that allows users to interact with MCP agents.

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine.

### Installation & Setup

1.  **Navigate to the client directory**:
    ```bash
    cd client
    ```

2.  **Configure Environment Variables**:
    Copy the example environment file and fill in your secrets.
    ```bash
    cp .env.example .env
    ```
    Open `.env` and add the LLM API keys (Anthropic, Gemini, or OpenAI) for the models you wish to use.

3.  **Install Dependencies**:
    ```bash
    bun install
    ```

4.  **Run Development Server**:
    ```bash
    bun run dev
    ```

The client will be running at [http://localhost:3002](http://localhost:3002).

## 🔌 Connection

The client is configured to expect the MCP server running at `http://localhost:8000`. Ensure the server is started before using the client features.
 