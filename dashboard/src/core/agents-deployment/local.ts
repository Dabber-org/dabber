import type { DeploymentStrategy, DeployResult } from "./types";
import type { Agent } from "@/generated/prisma";
import { generateLocalCompose } from "@/core/agents-deployment/generateLocalCompose";
import { runDockerCompose, stopDockerCompose } from "@/core/docker/execCompose";
import fs from "node:fs/promises";
import path from "node:path";

export class LocalDeploymentStrategy implements DeploymentStrategy {
  async deploy(agent: Agent): Promise<DeployResult> {
    const baseDir = path.join(process.cwd(), "deployments");
    const dir = path.join(baseDir, agent.id);
    const composePath = path.join(dir, "docker-compose.yml");

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(composePath, generateLocalCompose(agent));
    await runDockerCompose(composePath);

    console.log(`Agent ${agent.id} deployed locally`);
    return {};
  }

  async teardown(agent: Agent): Promise<void> {
    const baseDir = path.join(process.cwd(), "deployments");
    const dir = path.join(baseDir, agent.id);
    const composePath = path.join(dir, "docker-compose.yml");

    try {
      await stopDockerCompose(composePath);
    } catch (error) {
      console.error(`Error stopping Docker containers for agent ${agent.id}:`, error);
    }

    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Error removing deployment directory for agent ${agent.id}:`, error);
    }
  }
}
