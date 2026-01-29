import { spawn } from "node:child_process";

export function runDockerCompose(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("docker", ["compose", "-f", filePath, "up", "-d"], {
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error("Docker compose failed"));
    });
  });
}

export function stopDockerCompose(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("docker", ["compose", "-f", filePath, "down", "-v"], {
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error("Docker compose down failed"));
    });
  });
}
