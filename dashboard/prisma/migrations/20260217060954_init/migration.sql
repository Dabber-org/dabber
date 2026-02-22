/*
  Warnings:

  - You are about to drop the column `prompt` on the `agent` table. All the data in the column will be lost.
  - You are about to drop the column `vectorDB_URL` on the `agent` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "AgentStatus" ADD VALUE 'READY';

-- AlterTable
ALTER TABLE "agent" DROP COLUMN "prompt",
DROP COLUMN "vectorDB_URL",
ADD COLUMN     "apiBaseURL" TEXT,
ADD COLUMN     "clientPort" INTEGER,
ADD COLUMN     "composeId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "domain" TEXT,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "isDynamicEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isStaticEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serverPort" INTEGER,
ALTER COLUMN "scrapingURL" DROP NOT NULL;
