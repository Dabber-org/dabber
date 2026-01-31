# Dabber Admin Dashboard

The Dashboard is the central management hub for Dabber, built with Next.js and Prisma.

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine.

### Installation & Setup

1.  **Navigate to the dashboard directory**:
    ```bash
    cd dashboard
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

4.  **Generate Prisma Client**: (if your first time)
    ```bash
    bunx prisma generate
    ```

5.  **Run Development Server**:
    ```bash
    bun run dev
    ```

The dashboard will be running at [http://localhost:3000](http://localhost:3000).
