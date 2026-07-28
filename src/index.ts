// src/index.ts — Programmatic entry point composing all layers

export {
  GenerateArchitectureSpecUseCase,
  type LlmPort,
  type MockLoaderPort,
  type FileWriterPort,
} from "@/application/generate-architecture-spec";
export {
  GenerateDevSecOpsSpecUseCase,
  type Agent4MockLoaderPort,
  type Agent4FileWriterPort,
} from "@/application/generate-devsecops-spec";
export {
  GenerateMarketReportUseCase,
  type MarketReportMockLoaderPort,
  type GenerateMarketReportOptions,
} from "@/application/generate-market-report";
export {
  GenerateComplianceReportUseCase,
  type ComplianceReportMockLoaderPort,
  type GenerateComplianceReportOptions,
} from "@/application/generate-compliance-report";
export { VercelAiLlmClient } from "@/infrastructure/llm/vercel-ai-llm-client";
export { MockLlmClient } from "@/infrastructure/llm/mock-llm-client";
export { SchemaObjectLlmClient } from "@/infrastructure/llm/schema-object-llm-client";
export { JsonMockLoader } from "@/infrastructure/mocks/mock-loader";
export { Agent4JsonMockLoader } from "@/infrastructure/mocks/agent4-mock-loader";
export { MarketReportJsonMockLoader } from "@/infrastructure/mocks/market-report-mock-loader";
export { ComplianceReportJsonMockLoader } from "@/infrastructure/mocks/compliance-mock-loader";
export { KiroFileWriter } from "@/infrastructure/writers/kiro-file-writer";
export { Agent4FileWriter } from "@/infrastructure/writers/agent4-file-writer";
export {
  NoOpFileWriter,
  type NoOpWriteInvocation,
} from "@/infrastructure/writers/no-op-file-writer";
export { ARCHITECT_SYSTEM_PROMPT } from "@/prompts/architect-agent";
export { DEVSECOPS_SYSTEM_PROMPT } from "@/prompts/devsecops-agent";
export { COMPLIANCE_SYSTEM_PROMPT } from "@/prompts/compliance-agent";
export { MARKET_SYSTEM_PROMPT } from "@/prompts/market-agent";
export * from "@/domain/types";
export * from "@/domain/schemas";
export * from "@/domain/errors";
export * from "@/domain/market-report";
export * from "@/domain/market-report-schemas";
export * from "@/domain/compliance-report";
export * from "@/domain/compliance-report-schemas";
export * from "@/domain/api-contracts";

import { GenerateArchitectureSpecUseCase } from "@/application/generate-architecture-spec";
import { GenerateDevSecOpsSpecUseCase } from "@/application/generate-devsecops-spec";
import { VercelAiLlmClient } from "@/infrastructure/llm/vercel-ai-llm-client";
import { MockLlmClient } from "@/infrastructure/llm/mock-llm-client";
import { JsonMockLoader } from "@/infrastructure/mocks/mock-loader";
import { Agent4JsonMockLoader } from "@/infrastructure/mocks/agent4-mock-loader";
import { KiroFileWriter } from "@/infrastructure/writers/kiro-file-writer";
import { Agent4FileWriter } from "@/infrastructure/writers/agent4-file-writer";
import { ARCHITECT_SYSTEM_PROMPT } from "@/prompts/architect-agent";
import { DEVSECOPS_SYSTEM_PROMPT } from "@/prompts/devsecops-agent";

export interface CreateAgent2Options {
  /** OpenAI model name (default: "gpt-4o"). Ignored when mockLlmResponse is set. */
  model?: string;
  /** Path to agent1 mock file (default: ".kiro/mocks/agent1.mock.json") */
  mockPath?: string;
  /** When provided, skips real LLM calls and returns this response. No API key needed. */
  mockLlmResponse?: unknown;
}

export function createAgent2(options?: CreateAgent2Options) {
  const llm = options?.mockLlmResponse
    ? new MockLlmClient(options.mockLlmResponse)
    : new VercelAiLlmClient(options?.model);
  const mockLoader = new JsonMockLoader(options?.mockPath);
  const fileWriter = new KiroFileWriter();

  return new GenerateArchitectureSpecUseCase(
    llm,
    mockLoader,
    fileWriter,
    ARCHITECT_SYSTEM_PROMPT,
  );
}

export interface CreateAgent4Options {
  /** OpenAI model name (default: "gpt-4o"). Ignored when mockLlmResponse is set. */
  model?: string;
  /** Path to agent4 mock input file (default: ".kiro/mocks/agent4.mock.json") */
  mockPath?: string;
  /** When provided, skips real LLM calls and returns this response. No API key needed. */
  mockLlmResponse?: unknown;
}

export function createAgent4(options?: CreateAgent4Options) {
  const llm = options?.mockLlmResponse
    ? new MockLlmClient(options.mockLlmResponse)
    : new VercelAiLlmClient(options?.model);
  const mockLoader = new Agent4JsonMockLoader(options?.mockPath);
  const fileWriter = new Agent4FileWriter();

  return new GenerateDevSecOpsSpecUseCase(
    llm,
    mockLoader,
    fileWriter,
    DEVSECOPS_SYSTEM_PROMPT,
  );
}
