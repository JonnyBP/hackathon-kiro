// src/application/generate-architecture-spec.ts — Use case orchestrating the Agent 2 pipeline

import { z } from "zod";
import {
  Agent1Output,
  Agent2Output,
  GenerateSpecOptions,
} from "@/domain/types";
import { Agent1OutputSchema, Agent2OutputSchema } from "@/domain/schemas";
import { ValidationError, LlmError } from "@/domain/errors";

export interface LlmPort {
  invoke(systemPrompt: string, userPrompt: string): Promise<unknown>;
}

export interface MockLoaderPort {
  load(): Promise<Agent1Output>;
}

export interface FileWriterPort {
  writeAll(output: Agent2Output, basePath: string): Promise<void>;
}

export class GenerateArchitectureSpecUseCase {
  constructor(
    private readonly llm: LlmPort,
    private readonly mockLoader: MockLoaderPort,
    private readonly fileWriter: FileWriterPort,
    private readonly systemPrompt: string,
  ) {}

  async execute(options: GenerateSpecOptions = {}): Promise<Agent2Output> {
    // 1. Resolve input (Agent1 output or mock fallback)
    const rawInput = options.agent1Output ?? (await this.mockLoader.load());

    // 2. Validate input
    const inputResult = Agent1OutputSchema.safeParse(rawInput);
    if (!inputResult.success) {
      throw this.mapZodError(inputResult.error, "input-validation");
    }

    // 3. Build user prompt with input context
    const userPrompt = this.buildUserPrompt(
      inputResult.data,
      options.preferredStack,
    );

    // 4. Invoke LLM
    let rawOutput: unknown;
    try {
      rawOutput = await this.llm.invoke(this.systemPrompt, userPrompt);
    } catch (error) {
      throw this.classifyLlmError(error, inputResult.data);
    }

    // 5. Validate output
    const outputResult = Agent2OutputSchema.safeParse(rawOutput);
    if (!outputResult.success) {
      throw this.mapZodError(outputResult.error, "output-validation");
    }

    // 6. Write to disk
    await this.fileWriter.writeAll(outputResult.data, ".kiro");

    return outputResult.data;
  }

  private buildUserPrompt(
    input: Agent1Output,
    preferredStack?: string[],
  ): string {
    const stackNote = preferredStack
      ? `\nPreferred stack: ${preferredStack.join(", ")}`
      : "";
    return JSON.stringify(input) + stackNote;
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
    const isTransient =
      error instanceof Error &&
      (error.message.includes("timeout") ||
        error.message.includes("ECONNRESET") ||
        error.message.includes("503"));

    return new LlmError(
      error instanceof Error ? error.message : "Unknown LLM error",
      isTransient,
      "llm-invocation",
      { projectName: input.projectName },
      error instanceof Error ? error : undefined,
    );
  }
}
