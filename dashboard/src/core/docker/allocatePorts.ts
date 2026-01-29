import { prisma } from "@/core/db/prisma";

const START_SERVER_PORT = 40000;
const START_CLIENT_PORT = 45000;

export async function allocatePorts() {
  const last = await prisma.agent.findFirst({
    orderBy: { createdAt: "desc" },
    select: { serverPort: true, clientPort: true },
  });

  return {
    serverPort: (last?.serverPort ?? START_SERVER_PORT) + 1,
    clientPort: (last?.clientPort ?? START_CLIENT_PORT) + 1,
  };
}
