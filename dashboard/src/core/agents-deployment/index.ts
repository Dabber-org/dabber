import { env } from "@/env";
import type { DeploymentStrategy } from "./types";
import { LocalDeploymentStrategy } from "./local";
import { DokployDeploymentStrategy } from "./dokploy";

export function getDeploymentStrategy(): DeploymentStrategy {
  if (env.ENV === "production") {
    return new DokployDeploymentStrategy();
  }
  return new LocalDeploymentStrategy();
}

export function isProduction(): boolean {
  return env.ENV === "production";
}

export type { DeploymentStrategy, DeployResult } from "./types";
