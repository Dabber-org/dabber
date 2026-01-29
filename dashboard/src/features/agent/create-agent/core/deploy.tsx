import { generateCompose } from "./generateCompose";
import { runDockerCompose } from "@/core/docker/execCompose";
import fs from "node:fs/promises";
import path from "node:path";
import { Agent } from "@/generated/prisma";

export async function deployAgent(agent: Agent) {
  const baseDir = path.join(process.cwd(), "deployments");
  const dir = path.join(baseDir, agent.id);
  const composePath = path.join(dir, "docker-compose.yml");

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(composePath, generateCompose(agent));

  await runDockerCompose(composePath);

  console.log(`Agent ${agent.id} deployed successfully`);
}
