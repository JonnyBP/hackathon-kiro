// src/application/generate-compliance-report.ts — Use case orchestrating the Agent 3 pipeline
//
// Same structure as generate-architecture-spec.ts: constructor-injected ports, input
// validation, user prompt construction, LLM invocation, output validation and typed
// error classification. This use case NEVER writes files (Requirement 21.11).

import { z } from "zod";
import { Agent1Output, TechSteering } from "@/domain/types";
import { Agent1OutputSchema } from "@/domain/schemas";
import { ComplianceReport } from "@/domain/compliance-report";
import { ComplianceReportSchema } from "@/domain/compliance-report-schemas";
import { ValidationError, LlmError } from "@/domain/errors";

export interface LlmPort {
  invoke(systemPrompt: string, userPrompt: string): Promise<unknown>;
}

export interface ComplianceReportMockLoaderPort {
  load(): Promise<ComplianceReport>;
}

export interface GenerateComplianceReportOptions {
  /** Confirmed brief (same shape as Agent1Output, design decision D12). */
  brief: Agent1Output;
  /** Agent 2 technical facts, when the architecture section already resolved. */
  techSteering?: TechSteering;
  /** Regions selected in the Selector_Región, at most 6. */
  regions?: string[];
  /** When true, resolve the report from the mock file without invoking the LLM (R21.7). */
  useMock?: boolean;
}

export class GenerateComplianceReportUseCase {
  constructor(
    private readonly llm: LlmPort,
    private readonly mockLoader: ComplianceReportMockLoaderPort,
    private readonly systemPrompt: string,
  ) {}

  async execute(
    options: GenerateComplianceReportOptions,
  ): Promise<ComplianceReport> {
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
        options.techSteering,
        options.regions,
      );
      try {
        rawOutput = await this.llm.invoke(this.systemPrompt, userPrompt);
      } catch (error) {
        throw this.classifyLlmError(error, inputResult.data);
      }
    }

    // 3. Validate output
    const outputResult = ComplianceReportSchema.safeParse(rawOutput);
    if (!outputResult.success) {
      throw this.mapZodError(outputResult.error, "output-validation");
    }

    return outputResult.data as ComplianceReport;
  }

  private buildUserPrompt(
    input: Agent1Output,
    techSteering?: TechSteering,
    regions?: string[],
  ): string {
    // Missing facts stay missing: the prompt requires unknowns to be preserved as
    // unknown, so absent sections are simply omitted instead of defaulted.
    const payload: Record<string, unknown> = { brief: input };
    if (techSteering) payload.techSteering = techSteering;
    if (regions && regions.length > 0) payload.regions = regions;
    return JSON.stringify(payload);
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
