// Property-based tests for GenerateDevSecOpsSpec use case error handling
// Feature: agent4-devsecops
import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import {
  GenerateDevSecOpsSpecUseCase,
  LlmPort,
  Agent4MockLoaderPort,
  Agent4FileWriterPort,
} from "@/application/generate-devsecops-spec";
import { ValidationError, LlmError } from "@/domain/errors";
import { Agent4Input, Agent4Output } from "@/domain/types";

// --- Helpers ---

/** A valid Agent4Input that passes schema validation. */
function validAgent4Input(): Agent4Input {
  return {
    projectName: "TestProject",
    stack: ["node", "typescript"],
    architecturePattern: "Clean",
    securityPolicies: [
      { name: "ZodValidation", description: "Input validation", enforcement: "Middleware" },
    ],
    taskList: [
      { id: "t1", title: "Setup", description: "Initial setup task", dependencies: [] },
    ],
    complianceReport: {
      licenseSummary: [{ package: "express", license: "MIT" }],
      regulatoryFlags: [],
    },
  };
}

/** A valid Agent4Output that passes schema validation. */
function validAgent4Output(): Agent4Output {
  return {
    dockerfile: "FROM node:20-alpine AS builder\nRUN npm ci\nFROM node:20-alpine AS runtime\nCMD [\"start\"]",
    dockerCompose: "version: \"3\"\nservices:\n  app:\n    image: myapp\n    ports:\n      - \"3000:3000\"",
    ciPipeline: "name: CI\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4",
    hooks: {
      validateSpecs: "#!/bin/bash\necho 'validating specs'",
      scanSecrets: "#!/bin/bash\necho 'scanning secrets'",
    },
  };
}

// --- Mock factories ---

function createMockLlm(response?: unknown): LlmPort & { invoke: ReturnType<typeof vi.fn> } {
  return {
    invoke: vi.fn().mockResolvedValue(response ?? validAgent4Output()),
  };
}

function createThrowingLlm(error: Error): LlmPort & { invoke: ReturnType<typeof vi.fn> } {
  return {
    invoke: vi.fn().mockRejectedValue(error),
  };
}

function createMockLoader(): Agent4MockLoaderPort {
  return {
    load: vi.fn().mockResolvedValue(validAgent4Input()),
  };
}

function createMockFileWriter(): Agent4FileWriterPort {
  return {
    writeAll: vi.fn().mockResolvedValue(undefined),
  };
}

// --- Arbitraries ---

/**
 * Generates invalid Agent4Input-like objects that will fail schema validation.
 * Each variant violates a different constraint.
 */
const invalidAgent4InputArb = fc.oneof(
  // Empty projectName
  fc.constant({
    ...validAgent4Input(),
    projectName: "",
  }),
  // Whitespace-only projectName
  fc.constant({
    ...validAgent4Input(),
    projectName: "   ",
  }),
  // Empty stack array
  fc.constant({
    ...validAgent4Input(),
    stack: [],
  }),
  // Missing securityPolicies (empty array)
  fc.constant({
    ...validAgent4Input(),
    securityPolicies: [],
  }),
  // Missing taskList (empty array)
  fc.constant({
    ...validAgent4Input(),
    taskList: [],
  }),
  // Invalid complianceReport (empty licenseSummary)
  fc.constant({
    ...validAgent4Input(),
    complianceReport: { licenseSummary: [], regulatoryFlags: [] },
  }),
  // projectName exceeds max length (129 chars)
  fc.constant({
    ...validAgent4Input(),
    projectName: "a".repeat(129),
  }),
  // stack item exceeds max length (65 chars)
  fc.constant({
    ...validAgent4Input(),
    stack: ["a".repeat(65)],
  }),
  // Wrong type for projectName
  fc.constant({
    ...validAgent4Input(),
    projectName: 12345,
  }),
  // taskList item missing required field
  fc.constant({
    ...validAgent4Input(),
    taskList: [{ id: "t1", title: "T" }], // missing description and dependencies
  }),
);

/**
 * Generates invalid Agent4Output-like objects that will fail output schema validation.
 */
const invalidAgent4OutputArb = fc.oneof(
  // Dockerfile too short
  fc.constant({
    ...validAgent4Output(),
    dockerfile: "FROM x",
  }),
  // Dockerfile missing second FROM
  fc.constant({
    ...validAgent4Output(),
    dockerfile: "FROM node:20-alpine AS builder\nRUN npm ci\nCMD [\"start\"]  padding text here",
  }),
  // dockerCompose missing "services"
  fc.constant({
    ...validAgent4Output(),
    dockerCompose: "version: \"3\"\ncontainers:\n  app:\n    image: myapp",
  }),
  // ciPipeline missing "jobs"
  fc.constant({
    ...validAgent4Output(),
    ciPipeline: "name: CI\non: push\nsteps:\n  - uses: actions/checkout@v4",
  }),
  // hooks.validateSpecs missing shebang
  fc.constant({
    ...validAgent4Output(),
    hooks: { validateSpecs: "echo 'no shebang here'", scanSecrets: "#!/bin/bash\necho ok" },
  }),
  // hooks.scanSecrets too short
  fc.constant({
    ...validAgent4Output(),
    hooks: { validateSpecs: "#!/bin/bash\necho ok", scanSecrets: "#!/short" },
  }),
);

/**
 * Generates arbitrary error messages that do NOT contain transient keywords.
 */
const nonTransientMessageArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter(
    (s) =>
      !s.includes("timeout") &&
      !s.includes("ECONNRESET") &&
      !s.includes("503"),
  );

/**
 * Generates error messages that contain at least one transient keyword.
 */
const transientMessageArb = fc.oneof(
  fc.string({ minLength: 0, maxLength: 50 }).map((s) => `${s}timeout${s}`),
  fc.string({ minLength: 0, maxLength: 50 }).map((s) => `${s}ECONNRESET${s}`),
  fc.string({ minLength: 0, maxLength: 50 }).map((s) => `${s}503${s}`),
);

// --- Property 4: Schema validation failures produce correct ValidationError ---
// Feature: agent4-devsecops, Property 4: Schema validation failures produce correct ValidationError
// **Validates: Requirements 1.4, 2.6, 12.1**

describe("Feature: agent4-devsecops, Property 4: Schema validation failures produce correct ValidationError", () => {
  it("invalid input produces ValidationError with operation 'input-validation'", async () => {
    await fc.assert(
      fc.asyncProperty(invalidAgent4InputArb, async (invalidInput) => {
        const mockLlm = createMockLlm();
        const mockLoader = createMockLoader();
        const mockFileWriter = createMockFileWriter();

        const useCase = new GenerateDevSecOpsSpecUseCase(
          mockLlm,
          mockLoader,
          mockFileWriter,
          "system prompt",
        );

        try {
          await useCase.execute(invalidInput as unknown as Agent4Input);
          expect.fail("Expected ValidationError to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          const validationError = error as ValidationError;
          expect(validationError.operation).toBe("input-validation");
          // fieldPath should be a non-empty string (the Zod error path)
          expect(typeof validationError.fieldPath).toBe("string");
        }
      }),
      { numRuns: 100 },
    );
  });

  it("invalid LLM output produces ValidationError with operation 'output-validation'", async () => {
    await fc.assert(
      fc.asyncProperty(invalidAgent4OutputArb, async (invalidOutput) => {
        const mockLlm = createMockLlm(invalidOutput);
        const mockLoader = createMockLoader();
        const mockFileWriter = createMockFileWriter();

        const useCase = new GenerateDevSecOpsSpecUseCase(
          mockLlm,
          mockLoader,
          mockFileWriter,
          "system prompt",
        );

        try {
          await useCase.execute(validAgent4Input());
          expect.fail("Expected ValidationError to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          const validationError = error as ValidationError;
          expect(validationError.operation).toBe("output-validation");
          expect(typeof validationError.fieldPath).toBe("string");
        }
      }),
      { numRuns: 100 },
    );
  });
});

// --- Property 5: Input validation precedes LLM invocation ---
// Feature: agent4-devsecops, Property 5: Input validation precedes LLM invocation
// **Validates: Requirements 3.1, 3.3**

describe("Feature: agent4-devsecops, Property 5: Input validation precedes LLM invocation", () => {
  it("LLM is NEVER called when input validation fails", async () => {
    await fc.assert(
      fc.asyncProperty(invalidAgent4InputArb, async (invalidInput) => {
        const mockLlm = createMockLlm();
        const mockLoader = createMockLoader();
        const mockFileWriter = createMockFileWriter();

        const useCase = new GenerateDevSecOpsSpecUseCase(
          mockLlm,
          mockLoader,
          mockFileWriter,
          "system prompt",
        );

        try {
          await useCase.execute(invalidInput as unknown as Agent4Input);
          expect.fail("Expected ValidationError to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          // CRITICAL: LLM must NEVER be called when input is invalid
          expect(mockLlm.invoke).not.toHaveBeenCalled();
        }
      }),
      { numRuns: 100 },
    );
  });
});

// --- Property 6: LLM error classification by transient keywords ---
// Feature: agent4-devsecops, Property 6: LLM error classification by transient keywords
// **Validates: Requirements 3.4, 12.2, 12.3, 12.4**

describe("Feature: agent4-devsecops, Property 6: LLM error classification by transient keywords", () => {
  it("error messages containing transient keywords produce LlmError with isTransient=true", async () => {
    await fc.assert(
      fc.asyncProperty(transientMessageArb, async (message) => {
        const mockLlm = createThrowingLlm(new Error(message));
        const mockLoader = createMockLoader();
        const mockFileWriter = createMockFileWriter();

        const useCase = new GenerateDevSecOpsSpecUseCase(
          mockLlm,
          mockLoader,
          mockFileWriter,
          "system prompt",
        );

        try {
          await useCase.execute(validAgent4Input());
          expect.fail("Expected LlmError to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(LlmError);
          const llmError = error as LlmError;
          expect(llmError.isTransient).toBe(true);
          expect(llmError.operation).toBe("llm-invocation");
        }
      }),
      { numRuns: 100 },
    );
  });

  it("error messages without transient keywords produce LlmError with isTransient=false", async () => {
    await fc.assert(
      fc.asyncProperty(nonTransientMessageArb, async (message) => {
        const mockLlm = createThrowingLlm(new Error(message));
        const mockLoader = createMockLoader();
        const mockFileWriter = createMockFileWriter();

        const useCase = new GenerateDevSecOpsSpecUseCase(
          mockLlm,
          mockLoader,
          mockFileWriter,
          "system prompt",
        );

        try {
          await useCase.execute(validAgent4Input());
          expect.fail("Expected LlmError to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(LlmError);
          const llmError = error as LlmError;
          expect(llmError.isTransient).toBe(false);
          expect(llmError.operation).toBe("llm-invocation");
        }
      }),
      { numRuns: 100 },
    );
  });
});
