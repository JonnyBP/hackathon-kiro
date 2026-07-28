// Property-based tests for GenerateArchitectureSpec use case
// Feature: agent2-architect, Property 4: Input validation precedes LLM invocation
// **Validates: Requirements 5.1, 5.2**

import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import {
  GenerateArchitectureSpecUseCase,
  LlmPort,
  MockLoaderPort,
  FileWriterPort,
} from "@/application/generate-architecture-spec";
import { ValidationError } from "@/domain/errors";
import { ARCHITECT_SYSTEM_PROMPT } from "@/prompts/architect-agent";
import { Agent1Output } from "@/domain/types";

// --- Arbitraries for invalid Agent1Output ---

/**
 * Generates Agent1Output-like objects that are INVALID in various ways:
 * - missing fields, wrong types, empty strings, empty arrays, non-positive numbers
 */
const invalidAgent1OutputArb = fc.oneof(
  // Missing required field entirely
  fc.record({
    projectName: fc.constant(undefined),
    productVision: fc.string({ minLength: 1 }),
    targetAudience: fc.string({ minLength: 1 }),
    valueProposition: fc.string({ minLength: 1 }),
    mvpFeatures: fc.array(fc.string({ minLength: 1 }), {
      minLength: 1,
      maxLength: 3,
    }),
    expectedMetrics: fc.record({
      mvpMonthlyUsers: fc.integer({ min: 1, max: 1000 }),
      scaleMonthlyUsers: fc.integer({ min: 1, max: 100000 }),
      peakConcurrentConnections: fc.integer({ min: 1, max: 500 }),
    }),
  }),
  // Empty string for projectName (fails min(1))
  fc.record({
    projectName: fc.constant(""),
    productVision: fc.string({ minLength: 1 }),
    targetAudience: fc.string({ minLength: 1 }),
    valueProposition: fc.string({ minLength: 1 }),
    mvpFeatures: fc.array(fc.string({ minLength: 1 }), {
      minLength: 1,
      maxLength: 3,
    }),
    expectedMetrics: fc.record({
      mvpMonthlyUsers: fc.integer({ min: 1, max: 1000 }),
      scaleMonthlyUsers: fc.integer({ min: 1, max: 100000 }),
      peakConcurrentConnections: fc.integer({ min: 1, max: 500 }),
    }),
  }),
  // Empty mvpFeatures array (fails min(1))
  fc.record({
    projectName: fc.string({ minLength: 1 }),
    productVision: fc.string({ minLength: 1 }),
    targetAudience: fc.string({ minLength: 1 }),
    valueProposition: fc.string({ minLength: 1 }),
    mvpFeatures: fc.constant([]),
    expectedMetrics: fc.record({
      mvpMonthlyUsers: fc.integer({ min: 1, max: 1000 }),
      scaleMonthlyUsers: fc.integer({ min: 1, max: 100000 }),
      peakConcurrentConnections: fc.integer({ min: 1, max: 500 }),
    }),
  }),
  // Non-positive expectedMetrics values (fails positive())
  fc.record({
    projectName: fc.string({ minLength: 1 }),
    productVision: fc.string({ minLength: 1 }),
    targetAudience: fc.string({ minLength: 1 }),
    valueProposition: fc.string({ minLength: 1 }),
    mvpFeatures: fc.array(fc.string({ minLength: 1 }), {
      minLength: 1,
      maxLength: 3,
    }),
    expectedMetrics: fc.record({
      mvpMonthlyUsers: fc.integer({ min: -100, max: 0 }),
      scaleMonthlyUsers: fc.integer({ min: 1, max: 100000 }),
      peakConcurrentConnections: fc.integer({ min: 1, max: 500 }),
    }),
  }),
  // Wrong type for expectedMetrics (string instead of object)
  fc.record({
    projectName: fc.string({ minLength: 1 }),
    productVision: fc.string({ minLength: 1 }),
    targetAudience: fc.string({ minLength: 1 }),
    valueProposition: fc.string({ minLength: 1 }),
    mvpFeatures: fc.array(fc.string({ minLength: 1 }), {
      minLength: 1,
      maxLength: 3,
    }),
    expectedMetrics: fc.constant("not-an-object"),
  }),
  // mvpFeatures contains empty strings (fails inner min(1))
  fc.record({
    projectName: fc.string({ minLength: 1 }),
    productVision: fc.string({ minLength: 1 }),
    targetAudience: fc.string({ minLength: 1 }),
    valueProposition: fc.string({ minLength: 1 }),
    mvpFeatures: fc.constant([""]),
    expectedMetrics: fc.record({
      mvpMonthlyUsers: fc.integer({ min: 1, max: 1000 }),
      scaleMonthlyUsers: fc.integer({ min: 1, max: 100000 }),
      peakConcurrentConnections: fc.integer({ min: 1, max: 500 }),
    }),
  }),
);

// --- Mock implementations ---

function createMockLlm(): LlmPort & { invoke: ReturnType<typeof vi.fn> } {
  return {
    invoke: vi.fn(),
  };
}

function createMockLoader(): MockLoaderPort {
  return {
    load: vi.fn().mockResolvedValue({
      projectName: "MockProject",
      productVision: "A vision",
      targetAudience: "Devs",
      valueProposition: "Value",
      mvpFeatures: ["Feature1"],
      expectedMetrics: {
        mvpMonthlyUsers: 1000,
        scaleMonthlyUsers: 50000,
        peakConcurrentConnections: 200,
      },
    }),
  };
}

function createMockFileWriter(): FileWriterPort {
  return {
    writeAll: vi.fn().mockResolvedValue(undefined),
  };
}

// --- Property 4 Tests ---

describe("Feature: agent2-architect, Property 4: Input validation precedes LLM invocation", () => {
  it("LLM is NEVER called when input validation fails", async () => {
    await fc.assert(
      fc.asyncProperty(invalidAgent1OutputArb, async (invalidInput) => {
        const mockLlm = createMockLlm();
        const mockLoader = createMockLoader();
        const mockFileWriter = createMockFileWriter();

        const useCase = new GenerateArchitectureSpecUseCase(
          mockLlm,
          mockLoader,
          mockFileWriter,
          ARCHITECT_SYSTEM_PROMPT,
        );

        try {
          await useCase.execute({
            agent1Output: invalidInput as unknown as Agent1Output,
          });
          // Should not reach here — invalid input must throw
          expect.fail("Expected ValidationError to be thrown");
        } catch (error) {
          // Verify it's a ValidationError
          expect(error).toBeInstanceOf(ValidationError);

          // CRITICAL: LLM must NEVER be called
          expect(mockLlm.invoke).not.toHaveBeenCalled();
        }
      }),
      { numRuns: 100 },
    );
  });
});
