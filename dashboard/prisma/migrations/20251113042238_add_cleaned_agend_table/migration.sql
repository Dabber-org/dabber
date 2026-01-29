-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'FAILED');

-- CreateTable
CREATE TABLE "agent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL,
    "prompt" TEXT,
    "vectorDB_URL" TEXT,
    "openAPI_URL" TEXT,
    "name" TEXT NOT NULL,
    "scrapingURL" TEXT NOT NULL,

    CONSTRAINT "agent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_userId_idx" ON "agent"("userId");

-- AddForeignKey
ALTER TABLE "agent" ADD CONSTRAINT "agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
