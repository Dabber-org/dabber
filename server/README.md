# Dabber MCP Server

The Dabber Server is a Python-based Model Context Protocol (MCP) server that provides web scraping and vector search capabilities to agents.

## 🛠️ Prerequisites

1.  **Install uv**:
    `uv` is used for ultra-fast Python package and environment management.
    ```bash
    # macOS/Linux
    curl -LsSf https://astral.sh/uv/install.sh | sh
    ```
    For other platforms, see the [uv installation guide](https://github.com/astral-sh/uv).

2.  **Install Playwright Dependencies**:
    The server uses Playwright for web scraping.
    ```bash
    playwright install --with-deps chromium
    ```

## 🚀 Getting Started

1.  **Navigate to the server directory**:
    ```bash
    cd server
    ```

2.  **Configure Environment Variables**:
    Copy the example environment file and fill in your secrets.
    ```bash
    cp .env.example .env
    ```

3.  **Set Up Virtual Environment**:
    ```bash
    # Create venv if it doesn't exist
    uv venv
    
    # Activate the environment
    source .venv/bin/activate
    ```

4.  **Sync Dependencies**:
    ```bash
    uv sync
    ```

5.  **Run the Server**:
    ```bash
    python server.py
    ```

The server will be running at [http://localhost:8000](http://localhost:8000).

## 🔌 Configuration

The server expects the main admin dashboard to be running at `http://localhost:3000` for certain agent-related configurations.
