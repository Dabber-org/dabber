import type { DeploymentStrategy, DeployResult } from "./types";
import type { Agent } from "@/generated/prisma";
import { generateProductionCompose, buildComposeEnv } from "./generateProductionCompose";
import {
  createCompose,
  updateCompose,
  deployCompose,
  stopCompose,
  deleteCompose,
  createDomain,
} from "@/core/dokploy/client";

export class DokployDeploymentStrategy implements DeploymentStrategy {

  async deploy(agent: Agent): Promise<DeployResult> {
    
    const domain = `agent-${agent.id}.agents.dabber.qa`;
    const composeFile = generateProductionCompose();
    const composeEnv = buildComposeEnv(agent, domain);
    const composeName = `agent-${agent.id}`;

    const { composeId } = await createCompose(composeName, composeFile);

    await updateCompose(composeId, composeFile, composeEnv);

    await createDomain(composeId, domain, "mcp-client", 3000);

    await deployCompose(composeId);

    console.log(`Agent ${agent.id} deployed to Dokploy with domain ${domain}`);

    return { composeId, domain };
  }

  async teardown(agent: Agent): Promise<void> {
    if (!agent.composeId) {
      console.warn(`Agent ${agent.id} has no composeId, skipping Dokploy teardown`);
      return;
    }

    try {
      await stopCompose(agent.composeId);
    } catch (error) {
      console.error(`Error stopping Dokploy compose for agent ${agent.id}:`, error);
    }

    try {
      await deleteCompose(agent.composeId);
    } catch (error) {
      console.error(`Error deleting Dokploy compose for agent ${agent.id}:`, error);
    }
  }
}
