import { env } from "@/env";

const DOKPLOY_BASE_URL = "https://dokploy.dabber.qa/api";

type DokployRequestOptions = {
  method: "GET" | "POST";
  endpoint: string;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
};

async function dokployRequest<T>(options: DokployRequestOptions): Promise<T> {
  const apiKey = env.DOKPLOY_API_KEY;
  if (!apiKey) {
    throw new Error("DOKPLOY_API_KEY is not configured");
  }

  let url = `${DOKPLOY_BASE_URL}${options.endpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    ...(options.body && { body: JSON.stringify(options.body) }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Dokploy API error (${response.status}) at ${options.endpoint}: ${errorText}`
    );
  }

  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export type ComposeCreateResponse = {
  composeId: string;
};

export async function createCompose(
  name: string,
  composeFile: string
): Promise<ComposeCreateResponse> {
  const environmentId = env.DOKPLOY_ENVIRONMENT_ID;
  if (!environmentId) {
    throw new Error("DOKPLOY_ENVIRONMENT_ID is not configured");
  }

  return dokployRequest<ComposeCreateResponse>({
    method: "POST",
    endpoint: "/compose.create",
    body: {
      name,
      environmentId,
      composeFile,
      composeType: "stack",
    },
  });
}

export async function updateCompose(
  composeId: string,
  composeFile: string,
  composeEnv: string
): Promise<void> {
  await dokployRequest({
    method: "POST",
    endpoint: "/compose.update",
    body: {
      composeId,
      composeFile,
      env: composeEnv,
      sourceType: "raw",
    },
  });
}

export async function deployCompose(composeId: string): Promise<void> {
  await dokployRequest({
    method: "POST",
    endpoint: "/compose.deploy",
    body: { composeId },
  });
}

export async function stopCompose(composeId: string): Promise<void> {
  await dokployRequest({
    method: "POST",
    endpoint: "/compose.stop",
    body: { composeId },
  });
}

export async function deleteCompose(composeId: string): Promise<void> {
  await dokployRequest({
    method: "POST",
    endpoint: "/compose.delete",
    body: { composeId, deleteVolumes: true },
  });
}

export async function createDomain(
  composeId: string,
  host: string,
  serviceName: string,
  port: number
): Promise<void> {
  await dokployRequest({
    method: "POST",
    endpoint: "/domain.create",
    body: {
      composeId,
      host,
      serviceName,
      port,
      https: true,
      certificateType: "letsencrypt",
      domainType: "compose",
    },
  });
}
