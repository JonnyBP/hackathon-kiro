// src/application/generate-devsecops-spec.ts — Use case orchestrating the Agent 4 pipeline

import { z } from "zod";
import { Agent4Input, Agent4Output } from "@/domain/types";
import { Agent4InputSchema, Agent4OutputSchema } from "@/domain/schemas";
import { ValidationError, LlmError, FilesystemError } from "@/domain/errors";

export interface LlmPort {
  invoke(systemPrompt: string, userPrompt: string): Promise<unknown>;
}

export interface Agent4MockLoaderPort {
  load(): Promise<Agent4Input>;
}

export interface Agent4FileWriterPort {
  writeAll(output: Agent4Output, basePath: string): Promise<void>;
}

export class GenerateDevSecOpsSpecUseCase {
  constructor(
    private readonly llm: LlmPort,
    private readonly mockLoader: Agent4MockLoaderPort,
    private readonly fileWriter: Agent4FileWriterPort,
    private readonly systemPrompt: string,
  ) {}

  async execute(input?: Agent4Input): Promise<Agent4Output> {
    // 1. Resolve input or load from mock
    const rawInput = input ?? (await this.mockLoader.load());

    // 2. Validate input
    const inputResult = Agent4InputSchema.safeParse(rawInput);
    if (!inputResult.success) {
      throw this.mapZodError(inputResult.error, "input-validation");
    }
    const validatedInput = inputResult.data as unknown as Agent4Input;

    // 3. Build user prompt
    const userPrompt = this.buildUserPrompt(validatedInput);

    // 4. Invoke LLM
    let rawOutput: unknown;
    try {
      rawOutput = await this.llm.invoke(this.systemPrompt, userPrompt);
    } catch (error) {
      throw this.classifyLlmError(error);
    }

    // 5. Validate output
    const outputResult = Agent4OutputSchema.safeParse(rawOutput);
    if (!outputResult.success) {
      throw this.mapZodError(outputResult.error, "output-validation");
    }
    const validatedOutput = outputResult.data as unknown as Agent4Output;

    // 6. Write files
    try {
      await this.fileWriter.writeAll(validatedOutput, ".");
    } catch (error) {
      if (error instanceof FilesystemError) throw error;
      throw new FilesystemError(
        "unknown",
        "file-write",
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    return validatedOutput;
  }

  private buildUserPrompt(input: Agent4Input): string {
    return JSON.stringify(input);
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

  private classifyLlmError(error: unknown): LlmError {
    const TRANSIENT_PATTERNS = ["timeout", "ECONNRESET", "503"];
    const message = error instanceof Error ? error.message : String(error);
    const isTransient = TRANSIENT_PATTERNS.some((p) => message.includes(p));

    return new LlmError(
      message,
      isTransient,
      "llm-invocation",
      {},
      error instanceof Error ? error : undefined,
    );
  }
}
