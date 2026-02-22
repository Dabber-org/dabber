import type { Agent } from "@/generated/prisma";

export type DeployResult = {
  composeId?: string;
  domain?: string;
};

export interface DeploymentStrategy {
  deploy(agent: Agent): Promise<DeployResult>;
  teardown(agent: Agent): Promise<void>;
}
