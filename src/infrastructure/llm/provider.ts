// src/infrastructure/llm/provider.ts — Selects the LLM provider from environment variables
import type { LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { bedrock } from "@ai-sdk/amazon-bedrock";

/** Supported LLM providers. `openai` stays the default for backward compatibility. */
export type LlmProviderName = "openai" | "bedrock";

const DEFAULT_OPENAI_MODEL = "gpt-4o";
const DEFAULT_BEDROCK_MODEL = "amazon.nova-lite-v1:0";

/**
 * Reads `LLM_PROVIDER` and normalises it. Anything other than `bedrock`
 * resolves to `openai`, so an empty or misspelled value never breaks the build.
 */
export function resolveProviderName(
  raw: string | undefined = process.env.LLM_PROVIDER,
): LlmProviderName {
  return raw?.trim().toLowerCase() === "bedrock" ? "bedrock" : "openai";
}

/** Default model id per provider, overridable with `LLM_MODEL`. */
export function resolveModelId(
  provider: LlmProviderName,
  explicitModel?: string,
): string {
  if (explicitModel) return explicitModel;
  const fromEnv = process.env.LLM_MODEL?.trim();
  if (fromEnv) return fromEnv;
  return provider === "bedrock" ? DEFAULT_BEDROCK_MODEL : DEFAULT_OPENAI_MODEL;
}

/**
 * Builds the AI SDK model for the configured provider.
 *
 * Credentials are read by each provider from the environment and never passed
 * through here, so no secret is ever held in application state:
 * - openai:  OPENAI_API_KEY
 * - bedrock: AWS_REGION plus AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
 *            (and AWS_SESSION_TOKEN for temporary credentials)
 */
export function createLanguageModel(explicitModel?: string): LanguageModel {
  const provider = resolveProviderName();
  const modelId = resolveModelId(provider, explicitModel);
  return provider === "bedrock" ? bedrock(modelId) : openai(modelId);
}

/**
 * Names of the environment variables each provider needs, for pre-flight
 * checks. Returns the missing ones so a caller can fail with a generic
 * "incomplete configuration" message WITHOUT echoing the variable value.
 */
export function missingCredentialVars(
  provider: LlmProviderName = resolveProviderName(),
): readonly string[] {
  const required =
    provider === "bedrock"
      ? ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
      : ["OPENAI_API_KEY"];
  return required.filter((name) => !process.env[name]?.trim());
}
