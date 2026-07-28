// src/infrastructure/llm/mock-llm-client.ts — Mock LLM adapter for offline/demo usage
import { LlmPort } from "@/application/generate-architecture-spec";

/**
 * A mock LLM client that returns a predetermined response.
 * Useful for demos, testing, and offline development without API keys.
 */
export class MockLlmClient implements LlmPort {
  constructor(private readonly fixedResponse: unknown) {}

  async invoke(_systemPrompt: string, _userPrompt: string): Promise<unknown> {
    return this.fixedResponse;
  }
}
