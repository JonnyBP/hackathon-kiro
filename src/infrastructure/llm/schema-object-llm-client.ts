// src/infrastructure/llm/schema-object-llm-client.ts — Vercel AI SDK adapter bound to an
// arbitrary Zod output schema.
//
// VercelAiLlmClient is hard-wired to Agent2OutputSchema, so the Agent 1 and Agent 3
// endpoints need a client that receives their own output contract. Credentials stay in
// the server process: the SDK reads them from process.env inside the route handler.
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { LlmPort } from "@/application/generate-architecture-spec";

export class SchemaObjectLlmClient<T> implements LlmPort {
  constructor(
    private readonly schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    private readonly model: string = "gpt-4o",
  ) {}

  async invoke(systemPrompt: string, userPrompt: string): Promise<unknown> {
    const { object } = await generateObject({
      model: openai(this.model),
      schema: this.schema as unknown as z.ZodType<Record<string, unknown>>,
      system: systemPrompt,
      prompt: userPrompt,
    });
    return object;
  }
}
