# dabber

## Prerequisites

- [Task](https://taskfile.dev/) - Task runner
- [Bun](https://bun.sh/) - JavaScript runtime
- [uv](https://github.com/astral-sh/uv) - Python package manager
- [Docker](https://www.docker.com/) - Container runtime
 
## Tasks

Run `task --list` to see all available tasks.

### Client

| Command | Description |
|---------|-------------|
| `task client:install` | Install client dependencies using Bun | 
| `task client:dev` | Run MCP client in development mode |

### Server

| Command | Description |
|---------|-------------|
| `task server:setup` | Create venv (if missing) and sync dependencies |
| `task server:run` | Run MCP server via FastMCP HTTP transport |

### Dashboard

| Command | Description |
|---------|-------------|
| `task dashboard:setup` | Install dashboard dependencies using Bun |
| `task dashboard:dev` | Run dashboard in development mode |

### Docker Build

| Command | Description |
|---------|-------------|
| `task build:client` | Build the mcp-client Docker image |
| `task build:server` | Build the mcp-server Docker image |
| `task build` | Build all Docker images |

### Combined

| Command | Description |
|---------|-------------|
| `task dev` | Run both MCP client and server concurrently |