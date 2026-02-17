import { prisma } from "@/core/db/prisma";
import { AgentStatus } from "@/generated/prisma";
import { allocatePorts } from "@/core/docker/allocatePorts";
import { buildEmbedInfo } from "./embed";
import { CreateAgentResponse } from "../types";
import { getDeploymentStrategy, isProduction } from "@/core/agents-deployment";

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
  const ports = isProduction() ? null : await allocatePorts();

  const agent = await prisma.agent.create({
    data: {
      userId,
      status: AgentStatus.PENDING,
      name,
      scrapingUrl,
      openApiUrl,
      apiBaseUrl,
      clientPort: ports?.clientPort ?? null,
      serverPort: ports?.serverPort ?? null,
      isStaticEnabled: isStaticEnabled ?? false,
      isDynamicEnabled: isDynamicEnabled ?? false,
      instructions,
    },
  });

  const strategy = getDeploymentStrategy();
  const deployResult = await strategy.deploy(agent);

  let updatedAgent = agent;
  if (deployResult.composeId || deployResult.domain) {
    updatedAgent = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        composeId: deployResult.composeId,
        domain: deployResult.domain,
      },
    });
  }

  const { clientUrl, iframeEmbed } = buildEmbedInfo(updatedAgent);

  return {
    agent: updatedAgent,
    clientUrl,
    iframeEmbed,
  };
};
