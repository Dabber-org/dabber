# ElectroStore - Web Prototype

ElectroStore is a modern e-commerce reference implementation used to demonstrate Dabber's capabilities in a real-world scenario.

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine.

### Installation & Setup

1.  **Navigate to the web-prototype directory**:
    ```bash
    cd web-prototype
    ```

2.  **Configure Environment Variables**:
    Copy the example environment file and fill in your secrets.
    ```bash
    cp .env.example .env
    ```

3.  **Install Dependencies**:
    ```bash
    bun install
    ```

4.  **Database Setup**:
    ```bash
    # Generate Prisma client
    bunx prisma generate
    
    # Initialize database (run this if it's your first time)
    bunx prisma migrate dev --init
    ```

5.  **Run Development Server**:
    ```bash
    bun run dev
    ```

The web prototype will be running at [http://localhost:3001](http://localhost:3001).

## 🏗️ Architecture

This project follows a feature-based architecture:
- `src/features/`: Contains modularized business logic (products, cart, orders).
- `src/core/`: Shared utilities and configuration.
- `src/app/`: Next.js App Router pages.
