import { prisma } from "@/core/db/prisma";
import { AgentStatus } from "@/generated/prisma";
import { allocatePorts } from "@/core/docker/allocatePorts";
import { deployAgent } from "./deploy";
import { buildEmbedInfo } from "./embed";
import { CreateAgentResponse } from "../types";

type CreateAgentProps = {
  userId: string;
  name: string;
  scrapingUrl?: string | null;
  openApiUrl?: string | null;
  apiBaseUrl?: string | null;
  isStaticEnabled?: boolean;
  isDynamicEnabled?: boolean;
  instructions?: string | null;
};

export const createAgent = async ({
  userId,
  name,
  scrapingUrl,
  openApiUrl,
  apiBaseUrl,
  isStaticEnabled,
  isDynamicEnabled,
  instructions,
}: CreateAgentProps): Promise<CreateAgentResponse> => {
  const { serverPort, clientPort } = await allocatePorts();

  const agent = await prisma.agent.create({
    data: {
      userId,
      status: AgentStatus.PENDING,
      name,
      scrapingUrl,
      openApiUrl,
      apiBaseUrl,
      clientPort,
      serverPort,
      isStaticEnabled: isStaticEnabled ?? false,
      isDynamicEnabled: isDynamicEnabled ?? false,
      instructions,
    },
  });

  await deployAgent(agent);

  const { clientUrl, iframeEmbed } = buildEmbedInfo(agent);

  return {
    agent,
    clientUrl,
    iframeEmbed,
  };
};
