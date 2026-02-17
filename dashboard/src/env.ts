import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    BETTER_AUTH_SECRET: z.string(),
    DATABASE_URL: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    GEMINI_API_KEY: z.string(),
    ANTHROPIC_API_KEY: z.string(),
    BETTER_AUTH_URL: z.url(),
    OPENAI_API_KEY: z.string(),
    ENV: z.enum(["development", "production"]).default("development"),
    DOKPLOY_API_KEY: z.string().optional(),
    DOKPLOY_PROJECT_ID: z.string().optional(),
    DOKPLOY_ENVIRONMENT_ID: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
