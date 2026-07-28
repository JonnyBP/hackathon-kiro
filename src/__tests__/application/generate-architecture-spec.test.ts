// Unit tests for GenerateArchitectureSpec use case
// Requirements: 3.2, 3.3, 3.4, 3.5

import { describe, it, expect, vi } from "vitest";
import {
  GenerateArchitectureSpecUseCase,
  LlmPort,
  MockLoaderPort,
  FileWriterPort,
} from "@/application/generate-architecture-spec";
import { ValidationError, LlmError } from "@/domain/errors";
import { ARCHITECT_SYSTEM_PROMPT } from "@/prompts/architect-agent";
import { Agent1Output, Agent2Output } from "@/domain/types";

// --- Valid fixtures ---

const validAgent1Output: Agent1Output = {
  projectName: "TestProject",
  productVision: "Build a great product",
  targetAudience: "Developers",
  valueProposition: "Save time",
  mvpFeatures: ["Auth", "Dashboard"],
  expectedMetrics: {
    mvpMonthlyUsers: 1000,
    scaleMonthlyUsers: 100000,
    peakConcurrentConnections: 500,
  },
};

const validAgent2Output: Agent2Output = {
  techSteering: {
    stack: ["Next.js", "TypeScript"],
    architecturePattern: "Clean",
    solidBoundaries: [
      {
        principle: "Single Responsibility",
        rule: "One reason to change",
        layer: "Domain",
      },
    ],
    securityGuards: [
      {
        name: "JWT Auth",
        description: "Token-based authentication",
        enforcement: "Middleware",
      },
    ],
  },
  requirements: "WHEN user logs in, THE system SHALL authenticate credentials",
  design: {
    domainEntities: [
      {
        name: "User",
        properties: [{ name: "id", type: "string", required: true }],
        relationships: [],
      },
    ],
    mermaidDiagram: "sequenceDiagram\n  A->>B: Request",
    iamPolicySummary: [
      {
        service: "Lambda",
        actions: ["invoke"],
        resource: "*",
        effect: "Allow",
      },
    ],
    awsCostProjection: {
      mvpMonthlyCostUsd: [{ service: "Lambda", monthlyCostUsd: 5 }],
      scaleMonthlyCostUsd: [{ service: "Lambda", monthlyCostUsd: 50 }],
    },
  },
  tasks: [
    {
      id: "task-1",
      title: "Setup project",
      description: "Initialize repo",
      dependencies: [],
    },
  ],
};

// --- Mock factories ---

function createMockLlm(
  response: unknown = validAgent2Output,
): LlmPort & { invoke: ReturnType<typeof vi.fn> } {
  return {
    invoke: vi.fn().mockResolvedValue(response),
  };
}

function createMockLoader(
  data: Agent1Output = validAgent1Output,
): MockLoaderPort & { load: ReturnType<typeof vi.fn> } {
  return {
    load: vi.fn().mockResolvedValue(data),
  };
}

function createMockFileWriter(): FileWriterPort & {
  writeAll: ReturnType<typeof vi.fn>;
} {
  return {
    writeAll: vi.fn().mockResolvedValue(undefined),
  };
}

// --- Tests ---

describe("GenerateArchitectureSpecUseCase", () => {
  describe("happy path", () => {
    it("returns validated Agent2Output when LLM returns valid output", async () => {
      const llm = createMockLlm();
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      const result = await useCase.execute({
        agent1Output: validAgent1Output,
      });

      expect(result).toEqual(validAgent2Output);
      expect(llm.invoke).toHaveBeenCalledOnce();
      expect(writer.writeAll).toHaveBeenCalledWith(validAgent2Output, ".kiro");
    });

    it("passes system prompt and user prompt to LLM", async () => {
      const llm = createMockLlm();
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      await useCase.execute({ agent1Output: validAgent1Output });

      expect(llm.invoke).toHaveBeenCalledWith(
        ARCHITECT_SYSTEM_PROMPT,
        JSON.stringify(validAgent1Output),
      );
    });
  });

  describe("mock fallback (Requirement 3.3)", () => {
    it("loads from mock when no agent1Output is provided", async () => {
      const llm = createMockLlm();
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      await useCase.execute({});

      expect(loader.load).toHaveBeenCalledOnce();
      expect(llm.invoke).toHaveBeenCalledOnce();
    });

    it("does not call mock loader when agent1Output is provided", async () => {
      const llm = createMockLlm();
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      await useCase.execute({ agent1Output: validAgent1Output });

      expect(loader.load).not.toHaveBeenCalled();
    });
  });

  describe("preferredStack parameter (Requirement 3.4)", () => {
    it("includes preferred stack in user prompt when specified", async () => {
      const llm = createMockLlm();
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      await useCase.execute({
        agent1Output: validAgent1Output,
        preferredStack: ["React", "Node.js", "PostgreSQL"],
      });

      const userPrompt = llm.invoke.mock.calls[0]![1] as string;
      expect(userPrompt).toContain(
        "Preferred stack: React, Node.js, PostgreSQL",
      );
      expect(userPrompt).toContain(JSON.stringify(validAgent1Output));
    });

    it("does not include stack note when preferredStack is not provided", async () => {
      const llm = createMockLlm();
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      await useCase.execute({ agent1Output: validAgent1Output });

      const userPrompt = llm.invoke.mock.calls[0]![1] as string;
      expect(userPrompt).not.toContain("Preferred stack");
      expect(userPrompt).toBe(JSON.stringify(validAgent1Output));
    });
  });

  describe("LLM error classification (Requirement 3.5)", () => {
    it("classifies timeout errors as transient", async () => {
      const llm: LlmPort = {
        invoke: vi.fn().mockRejectedValue(new Error("Request timeout")),
      };
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      await expect(
        useCase.execute({ agent1Output: validAgent1Output }),
      ).rejects.toMatchObject({
        isTransient: true,
        category: "LLM_TRANSIENT",
        operation: "llm-invocation",
      });
    });

    it("classifies ECONNRESET errors as transient", async () => {
      const llm: LlmPort = {
        invoke: vi.fn().mockRejectedValue(new Error("ECONNRESET")),
      };
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      await expect(
        useCase.execute({ agent1Output: validAgent1Output }),
      ).rejects.toMatchObject({
        isTransient: true,
        category: "LLM_TRANSIENT",
      });
    });

    it("classifies 503 errors as transient", async () => {
      const llm: LlmPort = {
        invoke: vi.fn().mockRejectedValue(new Error("Service Unavailable 503")),
      };
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      await expect(
        useCase.execute({ agent1Output: validAgent1Output }),
      ).rejects.toMatchObject({
        isTransient: true,
        category: "LLM_TRANSIENT",
      });
    });

    it("classifies other errors as permanent", async () => {
      const llm: LlmPort = {
        invoke: vi.fn().mockRejectedValue(new Error("401 Unauthorized")),
      };
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      await expect(
        useCase.execute({ agent1Output: validAgent1Output }),
      ).rejects.toMatchObject({
        isTransient: false,
        category: "LLM_PERMANENT",
      });
    });

    it("classifies non-Error thrown values as permanent", async () => {
      const llm: LlmPort = {
        invoke: vi.fn().mockRejectedValue("string error"),
      };
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      await expect(
        useCase.execute({ agent1Output: validAgent1Output }),
      ).rejects.toMatchObject({
        isTransient: false,
        message: "Unknown LLM error",
      });
    });

    it("includes projectName in LLM error context", async () => {
      const llm: LlmPort = {
        invoke: vi.fn().mockRejectedValue(new Error("Some error")),
      };
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      try {
        await useCase.execute({ agent1Output: validAgent1Output });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(LlmError);
        expect((error as LlmError).context).toEqual({
          projectName: "TestProject",
        });
      }
    });
  });

  describe("input validation (Requirements 5.1, 5.2)", () => {
    it("throws ValidationError for invalid agent1Output", async () => {
      const llm = createMockLlm();
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      await expect(
        useCase.execute({ agent1Output: { projectName: "" } as Agent1Output }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("throws ValidationError with correct operation for input failures", async () => {
      const llm = createMockLlm();
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      try {
        await useCase.execute({
          agent1Output: { projectName: "" } as Agent1Output,
        });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).operation).toBe("input-validation");
      }
    });
  });

  describe("output validation (Requirement 3.5)", () => {
    it("throws ValidationError when LLM returns invalid output", async () => {
      const llm: LlmPort = {
        invoke: vi.fn().mockResolvedValue({ invalid: "output" }),
      };
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      await expect(
        useCase.execute({ agent1Output: validAgent1Output }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("throws ValidationError with output-validation operation", async () => {
      const llm: LlmPort = {
        invoke: vi.fn().mockResolvedValue({ invalid: "output" }),
      };
      const loader = createMockLoader();
      const writer = createMockFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        llm,
        loader,
        writer,
        ARCHITECT_SYSTEM_PROMPT,
      );

      try {
        await useCase.execute({ agent1Output: validAgent1Output });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).operation).toBe("output-validation");
      }
    });
  });
});
