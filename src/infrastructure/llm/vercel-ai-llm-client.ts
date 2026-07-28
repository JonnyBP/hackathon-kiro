// src/infrastructure/llm/vercel-ai-llm-client.ts — Vercel AI SDK LLM adapter implementing LlmPort
import { generateObject } from "ai";
import type { z } from "zod";
import { Agent2OutputSchema } from "@/domain/schemas";
import { LlmPort } from "@/application/generate-architecture-spec";
import { createLanguageModel } from "@/infrastructure/llm/provider";

export class VercelAiLlmClient implements LlmPort {
  /**
   * @param model Explicit model id. When omitted, it is resolved from
   *   `LLM_MODEL` or the provider default (see `provider.ts`).
   * @param schema Structured-output schema the model must satisfy. Defaults to
   *   `Agent2OutputSchema` for backward compatibility, but every agent must
   *   pass its own: forcing Agent 2's shape on another agent makes
   *   `generateObject` reject valid output.
   */
  constructor(
    private readonly model?: string,
    private readonly schema: z.ZodTypeAny = Agent2OutputSchema,
  ) {}

  async invoke(systemPrompt: string, userPrompt: string): Promise<unknown> {
    const { object } = await generateObject({
      model: createLanguageModel(this.model),
      schema: this.schema,
      system: systemPrompt,
      prompt: userPrompt,
    });
    return object;
  }
}
