// Property-based tests for error context propagation
// Feature: agent2-architect, Property 5: All errors carry contextual information
// **Validates: Requirements 5.4**
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  Agent2Error,
  ValidationError,
  LlmError,
  FilesystemError,
  ErrorCategory,
} from "@/domain/errors";

// --- Arbitraries ---

const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 });

const errorCategoryArb: fc.Arbitrary<ErrorCategory> = fc.constantFrom(
  "VALIDATION",
  "LLM_TRANSIENT",
  "LLM_PERMANENT",
  "FILESYSTEM",
);

const contextArb = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }),
  fc.oneof(nonEmptyString, fc.integer(), fc.boolean()),
  { minKeys: 1, maxKeys: 5 },
);

const validationErrorArb = fc.tuple(
  nonEmptyString, // fieldPath
  nonEmptyString, // expectedType
  fc.oneof(nonEmptyString, fc.integer(), fc.constant(null)), // receivedValue
  nonEmptyString, // operation
);

const llmErrorArb = fc.tuple(
  nonEmptyString, // message
  fc.boolean(), // isTransient
  nonEmptyString, // operation
  contextArb, // context
);

const filesystemErrorArb = fc.tuple(
  nonEmptyString, // targetPath
  nonEmptyString, // operation
  nonEmptyString, // cause message
);

const agent2ErrorArb = fc.tuple(
  nonEmptyString, // message
  errorCategoryArb, // category
  nonEmptyString, // operation
  contextArb, // context
);

// --- Property 5: All errors carry contextual information ---

describe("Feature: agent2-architect, Property 5: All errors carry contextual information", () => {
  it("Agent2Error always carries operation (non-empty string) and context (non-null object)", () => {
    fc.assert(
      fc.property(agent2ErrorArb, ([message, category, operation, context]) => {
        const error = new Agent2Error(message, category, operation, context);

        expect(typeof error.operation).toBe("string");
        expect(error.operation.length).toBeGreaterThan(0);
        expect(error.context).not.toBeNull();
        expect(typeof error.context).toBe("object");
      }),
      { numRuns: 100 },
    );
  });

  it("ValidationError always carries operation and context fields", () => {
    fc.assert(
      fc.property(
        validationErrorArb,
        ([fieldPath, expectedType, receivedValue, operation]) => {
          const error = new ValidationError(
            fieldPath,
            expectedType,
            receivedValue,
            operation,
          );

          // operation is non-empty string
          expect(typeof error.operation).toBe("string");
          expect(error.operation.length).toBeGreaterThan(0);

          // context is a non-null object
          expect(error.context).not.toBeNull();
          expect(typeof error.context).toBe("object");

          // context contains relevant information
          expect(error.context).toHaveProperty("fieldPath");
          expect(error.context).toHaveProperty("expectedType");

          // Inherits from Agent2Error
          expect(error).toBeInstanceOf(Agent2Error);
          expect(error.category).toBe("VALIDATION");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("LlmError always carries operation and context fields", () => {
    fc.assert(
      fc.property(llmErrorArb, ([message, isTransient, operation, context]) => {
        const error = new LlmError(message, isTransient, operation, context);

        // operation is non-empty string
        expect(typeof error.operation).toBe("string");
        expect(error.operation.length).toBeGreaterThan(0);

        // context is a non-null object
        expect(error.context).not.toBeNull();
        expect(typeof error.context).toBe("object");

        // Inherits from Agent2Error
        expect(error).toBeInstanceOf(Agent2Error);
        expect(
          error.category === "LLM_TRANSIENT" ||
            error.category === "LLM_PERMANENT",
        ).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("FilesystemError always carries operation and context fields", () => {
    fc.assert(
      fc.property(
        filesystemErrorArb,
        ([targetPath, operation, causeMessage]) => {
          const cause = new Error(causeMessage);
          const error = new FilesystemError(targetPath, operation, cause);

          // operation is non-empty string
          expect(typeof error.operation).toBe("string");
          expect(error.operation.length).toBeGreaterThan(0);

          // context is a non-null object
          expect(error.context).not.toBeNull();
          expect(typeof error.context).toBe("object");

          // context contains the targetPath
          expect(error.context).toHaveProperty("targetPath");

          // Inherits from Agent2Error
          expect(error).toBeInstanceOf(Agent2Error);
          expect(error.category).toBe("FILESYSTEM");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("all error subclasses have non-empty operation regardless of input scenario", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          validationErrorArb.map(
            ([fp, et, rv, op]) =>
              new ValidationError(fp, et, rv, op) as Agent2Error,
          ),
          llmErrorArb.map(
            ([msg, trans, op, ctx]) =>
              new LlmError(msg, trans, op, ctx) as Agent2Error,
          ),
          filesystemErrorArb.map(
            ([tp, op, cm]) =>
              new FilesystemError(tp, op, new Error(cm)) as Agent2Error,
          ),
        ),
        (error) => {
          // Universal property: operation is always a non-empty string
          expect(typeof error.operation).toBe("string");
          expect(error.operation.length).toBeGreaterThan(0);

          // Universal property: context is always a non-null object
          expect(error.context).not.toBeNull();
          expect(typeof error.context).toBe("object");
        },
      ),
      { numRuns: 100 },
    );
  });
});
