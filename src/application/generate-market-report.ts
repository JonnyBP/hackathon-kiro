// src/application/generate-market-report.ts — Use case orchestrating the Agent 1 pipeline
//
// Same structure as generate-architecture-spec.ts: constructor-injected ports, input
// validation, user prompt construction, LLM invocation, output validation and typed
// error classification. This use case NEVER writes files (Requirement 21.11).

import { z } from "zod";
import { Agent1Output } from "@/domain/types";
import { Agent1OutputSchema } from "@/domain/schemas";
import { MarketReport } from "@/domain/market-report";
import { MarketReportSchema } from "@/domain/market-report-schemas";
import { ValidationError, LlmError } from "@/domain/errors";

export interface LlmPort {
  invoke(systemPrompt: string, userPrompt: string): Promise<unknown>;
}

export interface MarketReportMockLoaderPort {
  load(): Promise<MarketReport>;
}

export interface GenerateMarketReportOptions {
  /** Confirmed brief (same shape as Agent1Output, design decision D12). */
  brief: Agent1Output;
  /** Regions selected in the Selector_Región, at most 6. */
  regions?: string[];
  /** Free-text constraints captured in the input form. */
  constraints?: string;
  /** When true, resolve the report from the mock file without invoking the LLM (R21.7). */
  useMock?: boolean;
}

export class GenerateMarketReportUseCase {
  constructor(
    private readonly llm: LlmPort,
    private readonly mockLoader: MarketReportMockLoaderPort,
    private readonly systemPrompt: string,
  ) {}

  async execute(options: GenerateMarketReportOptions): Promise<MarketReport> {
    // 1. Validate input
    const inputResult = Agent1OutputSchema.safeParse(options.brief);
    if (!inputResult.success) {
      throw this.mapZodError(inputResult.error, "input-validation");
    }

    // 2. Resolve the raw report: mock file or LLM
    let rawOutput: unknown;
    if (options.useMock) {
      rawOutput = await this.mockLoader.load();
    } else {
      const userPrompt = this.buildUserPrompt(
        inputResult.data,
        options.regions,
        options.constraints,
      );
      try {
        rawOutput = await this.llm.invoke(this.systemPrompt, userPrompt);
      } catch (error) {
        throw this.classifyLlmError(error, inputResult.data);
      }
    }

    // 3. Validate output
    const outputResult = MarketReportSchema.safeParse(rawOutput);
    if (!outputResult.success) {
      throw this.mapZodError(outputResult.error, "output-validation");
    }

    return outputResult.data as MarketReport;
  }

  private buildUserPrompt(
    input: Agent1Output,
    regions?: string[],
    constraints?: string,
  ): string {
    const regionNote =
      regions && regions.length > 0
        ? `\nTarget regions: ${regions.join(", ")}`
        : "";
    const constraintNote = constraints
      ? `\nConstraints: ${constraints}`
      : "";
    return JSON.stringify(input) + regionNote + constraintNote;
  }

  private mapZodError(
    zodError: z.ZodError,
    operation: string,
  ): ValidationError {
    const firstIssue = zodError.issues[0]!;
    return new ValidationError(
      firstIssue.path.join("."),
      firstIssue.message,
      undefined,
      operation,
    );
  }

  private classifyLlmError(error: unknown, input: Agent1Output): LlmError {
    const TRANSIENT_PATTERNS = ["timeout", "ECONNRESET", "503"];
    const message = error instanceof Error ? error.message : "Unknown LLM error";
    const isTransient = TRANSIENT_PATTERNS.some((p) => message.includes(p));

    return new LlmError(
      message,
      isTransient,
      "llm-invocation",
      { projectName: input.projectName },
      error instanceof Error ? error : undefined,
    );
  }
}
