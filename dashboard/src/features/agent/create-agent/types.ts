import { z } from "zod";
import { Agent } from "@/generated/prisma";

export const capabilityOptions = ["staticKnowledge", "dynamicIntegration"] as const;
export type CapabilityOption = (typeof capabilityOptions)[number];

export const setupStepFormSchema = z.object({
  assistantName: z.string().min(1, "Assistant name is required"),
  instructions: z.string().optional().nullable(),
  capabilities: z.array(z.enum(capabilityOptions)).min(1, "Select at least one capability to continue"),
});

export type SetupStepFormData = z.infer<typeof setupStepFormSchema>;

export const staticConfigStepFormSchema = z.object({
  websiteUrl: z.url("Invalid website URL"),
});

export type StaticConfigStepFormData = z.infer<typeof staticConfigStepFormSchema>;

export const dynamicKnowledgeStepFormSchema = z.object({
  apiBaseUrl: z.url("Invalid API base URL"),
  openApiUrl: z.url("Invalid OpenAPI URL"),
  apiKey: z.string("API key is required"),
});

export type DynamicKnowledgeStepFormData = z.infer<typeof dynamicKnowledgeStepFormSchema>;

export const createAgentSchema = z.object({
  name: z.string().min(1),
  instructions: z.string().optional().nullable(),
  scrapingUrl: z.url().optional().nullable(),
  openApiUrl: z.url().optional().nullable(),
  apiBaseUrl: z.url().optional().nullable(),
  isStaticEnabled: z.boolean().optional(),
  isDynamicEnabled: z.boolean().optional(),
});

export type CreateAgentProps = z.infer<typeof createAgentSchema>;

export const updateAgentStatusSchema = z.object({
  status: z
    .string()
    .transform((val) => val.toUpperCase())
    .pipe(z.enum(["ACTIVE", "INACTIVE", "PENDING", "FAILED", "READY"])),
});

export type CreateAgentResponse = {
  agent: Agent;
  clientUrl: string;
  iframeEmbed: string;
};
