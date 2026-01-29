import { prisma } from "@/core/db/prisma";

export const getAgents = async (userId: string) => {
  return prisma.agent.findMany({
    where: {
      userId,
    },
  });
};
