import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { env } from "@/env";

const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const anthropic = createAnthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: env.GEMINI_API_KEY,
});

export function getModel(llmType: string): LanguageModel {
  switch (llmType) {
    case "claude":
      return anthropic(
        env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929"
      );
    case "gemini":
      return google(env.GEMINI_MODEL || "gemini-2.5-flash");
    case "openai":
    default:
      return openai(env.OPENAI_MODEL || "gpt-5.1");
  }
}
