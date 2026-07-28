// Unit tests for domain error hierarchy
import { describe, it, expect } from "vitest";
import {
  Agent2Error,
  ValidationError,
  LlmError,
  FilesystemError,
} from "@/domain/errors";

describe("Agent2Error", () => {
  it("carries category, operation, and context", () => {
    const error = new Agent2Error("Something failed", "VALIDATION", "test-op", {
      key: "value",
    });

    expect(error.message).toBe("Something failed");
    expect(error.category).toBe("VALIDATION");
    expect(error.operation).toBe("test-op");
    expect(error.context).toEqual({ key: "value" });
    expect(error.name).toBe("Agent2Error");
    expect(error).toBeInstanceOf(Error);
  });

  it("carries optional cause", () => {
    const cause = new Error("root cause");
    const error = new Agent2Error(
      "Wrapped error",
      "FILESYSTEM",
      "write",
      {},
      cause,
    );

    expect(error.cause).toBe(cause);
  });
});

describe("ValidationError", () => {
  it("carries fieldPath, expectedType, and receivedValue", () => {
    const error = new ValidationError(
      "techSteering.stack",
      "array",
      null,
      "input-validation",
    );

    expect(error.fieldPath).toBe("techSteering.stack");
    expect(error.expectedType).toBe("array");
    expect(error.receivedValue).toBeNull();
    expect(error.operation).toBe("input-validation");
    expect(error.category).toBe("VALIDATION");
    expect(error.name).toBe("ValidationError");
    expect(error).toBeInstanceOf(Agent2Error);
  });

  it("includes fieldPath in message", () => {
    const error = new ValidationError(
      "requirements",
      "string",
      123,
      "output-validation",
    );

    expect(error.message).toContain("requirements");
    expect(error.message).toContain("string");
  });

  it("stores receivedValue in context", () => {
    const error = new ValidationError(
      "design.domainEntities",
      "array",
      undefined,
      "output-validation",
    );

    expect(error.context).toEqual({
      fieldPath: "design.domainEntities",
      expectedType: "array",
      receivedValue: undefined,
    });
  });
});

describe("LlmError", () => {
  it("classifies transient errors correctly", () => {
    const error = new LlmError("Connection timeout", true, "llm-invocation", {
      projectName: "TestProject",
    });

    expect(error.isTransient).toBe(true);
    expect(error.category).toBe("LLM_TRANSIENT");
    expect(error.name).toBe("LlmError");
    expect(error.operation).toBe("llm-invocation");
    expect(error.context).toEqual({ projectName: "TestProject" });
    expect(error).toBeInstanceOf(Agent2Error);
  });

  it("classifies permanent errors correctly", () => {
    const error = new LlmError("401 Unauthorized", false, "llm-invocation", {
      model: "gpt-4o",
    });

    expect(error.isTransient).toBe(false);
    expect(error.category).toBe("LLM_PERMANENT");
  });

  it("wraps underlying cause", () => {
    const cause = new Error("ECONNRESET");
    const error = new LlmError(
      "Network error",
      true,
      "llm-invocation",
      {},
      cause,
    );

    expect(error.cause).toBe(cause);
  });
});

describe("FilesystemError", () => {
  it("carries targetPath and wraps the underlying cause", () => {
    const cause = new Error("ENOENT: no such file or directory");
    const error = new FilesystemError("/path/to/file.md", "file-write", cause);

    expect(error.targetPath).toBe("/path/to/file.md");
    expect(error.operation).toBe("file-write");
    expect(error.category).toBe("FILESYSTEM");
    expect(error.cause).toBe(cause);
    expect(error.name).toBe("FilesystemError");
    expect(error).toBeInstanceOf(Agent2Error);
  });

  it("includes targetPath and cause message in error message", () => {
    const cause = new Error("permission denied");
    const error = new FilesystemError(
      ".kiro/specs/design.md",
      "file-write",
      cause,
    );

    expect(error.message).toContain(".kiro/specs/design.md");
    expect(error.message).toContain("permission denied");
  });

  it("stores targetPath in context", () => {
    const cause = new Error("disk full");
    const error = new FilesystemError("/tmp/output.md", "file-write", cause);

    expect(error.context).toEqual({ targetPath: "/tmp/output.md" });
  });
});
