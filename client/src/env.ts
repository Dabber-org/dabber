import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // API keys — required for their respective provider
    OPENAI_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    GEMINI_API_KEY: z.string().min(1).optional(),

    // Model overrides — optional
    OPENAI_MODEL: z.string().optional(),
    ANTHROPIC_MODEL: z.string().optional(),
    GEMINI_MODEL: z.string().optional(),

    // MCP server URL
    SERVER_URL: z.url().optional(),

    // Optional customization
    AGENT_NAME: z.string("Dabber").optional(),
    USER_INSTRUCTIONS: z.string().optional(),
    APP_URL: z.url().optional(),
  },

  experimental__runtimeEnv: {},

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
