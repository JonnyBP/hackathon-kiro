// src/__tests__/integration/pipeline.test.ts — End-to-end integration tests
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  GenerateArchitectureSpecUseCase,
  type LlmPort,
  type FileWriterPort,
} from "@/application/generate-architecture-spec";
import { JsonMockLoader } from "@/infrastructure/mocks/mock-loader";
import { KiroFileWriter } from "@/infrastructure/writers/kiro-file-writer";
import { ARCHITECT_SYSTEM_PROMPT } from "@/prompts/architect-agent";
import { ValidationError } from "@/domain/errors";
import type { Agent1Output, Agent2Output } from "@/domain/types";

// --- Helpers ---

const VALID_AGENT1_OUTPUT: Agent1Output = {
  projectName: "TestProject",
  productVision: "A test product vision",
  targetAudience: "Developers",
  valueProposition: "Simplifies testing",
  mvpFeatures: ["Feature A", "Feature B"],
  expectedMetrics: {
    mvpMonthlyUsers: 100,
    scaleMonthlyUsers: 10000,
    peakConcurrentConnections: 50,
  },
};

const VALID_AGENT2_OUTPUT: Agent2Output = {
  techSteering: {
    stack: ["TypeScript", "Node.js", "Vitest"],
    architecturePattern: "Clean",
    solidBoundaries: [
      {
        principle: "SRP",
        rule: "Each module has one reason to change",
        layer: "Domain",
      },
    ],
    securityGuards: [
      {
        name: "Zod Validation",
        description: "Input validation on all boundaries",
        enforcement: "Middleware",
      },
    ],
  },
  requirements:
    "WHEN the user submits a form, THE system SHALL validate all fields",
  design: {
    domainEntities: [
      {
        name: "Project",
        properties: [
          { name: "id", type: "string", required: true },
          { name: "name", type: "string", required: true },
        ],
        relationships: ["has many Features"],
      },
    ],
    mermaidDiagram:
      "sequenceDiagram\n  participant A as Agent1\n  participant B as Agent2\n  A->>B: send output",
    iamPolicySummary: [
      {
        service: "Lambda",
        actions: ["lambda:InvokeFunction"],
        resource: "arn:aws:lambda:*:*:function:test",
        effect: "Allow",
      },
    ],
    awsCostProjection: {
      mvpMonthlyCostUsd: [{ service: "Lambda", monthlyCostUsd: 5.0 }],
      scaleMonthlyCostUsd: [{ service: "Lambda", monthlyCostUsd: 50.0 }],
    },
  },
  tasks: [
    {
      id: "task-1",
      title: "Setup project",
      description: "Initialize project structure",
      dependencies: [],
    },
    {
      id: "task-2",
      title: "Implement domain",
      description: "Create domain types",
      dependencies: ["task-1"],
    },
  ],
};

class MockLlm implements LlmPort {
  constructor(private readonly response: unknown) {}

  async invoke(_systemPrompt: string, _userPrompt: string): Promise<unknown> {
    return this.response;
  }
}

// --- Tests ---

describe("Integration: End-to-end pipeline", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agent2-integration-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("Scenario 1: Happy path with mocked LLM", () => {
    it("should produce validated output and write files to disk", async () => {
      const mockLlm = new MockLlm(VALID_AGENT2_OUTPUT);
      const mockLoader = new JsonMockLoader(); // won't be used
      const fileWriter = new KiroFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        mockLlm,
        mockLoader,
        fileWriter,
        ARCHITECT_SYSTEM_PROMPT,
      );

      // Use a custom file writer targeting our temp dir
      const tempFileWriter = new KiroFileWriter();
      const tempUseCase = new GenerateArchitectureSpecUseCase(
        mockLlm,
        mockLoader,
        tempFileWriter,
        ARCHITECT_SYSTEM_PROMPT,
      );

      // We need to override writeAll base path — invoke directly
      const result = await tempUseCase.execute({
        agent1Output: VALID_AGENT1_OUTPUT,
      });

      // Verify the returned output matches expectations
      expect(result).toEqual(VALID_AGENT2_OUTPUT);
      expect(result.techSteering.stack).toContain("TypeScript");
      expect(result.tasks).toHaveLength(2);
      expect(result.design.domainEntities[0]!.name).toBe("Project");

      // Also verify the file writer works by writing to temp dir directly
      await tempFileWriter.writeAll(result, tempDir);

      // Check files exist with correct content
      const techContent = await readFile(
        join(tempDir, "steering", "tech.md"),
        "utf-8",
      );
      expect(techContent).toContain("TypeScript");
      expect(techContent).toContain("Clean");
      expect(techContent).toContain("SRP");

      const reqContent = await readFile(
        join(tempDir, "specs", "requirements.md"),
        "utf-8",
      );
      expect(reqContent).toContain("WHEN the user submits a form");

      const designContent = await readFile(
        join(tempDir, "specs", "design.md"),
        "utf-8",
      );
      expect(designContent).toContain("Project");
      expect(designContent).toContain("sequenceDiagram");

      const tasksContent = await readFile(
        join(tempDir, "specs", "tasks.md"),
        "utf-8",
      );
      expect(tasksContent).toContain("Setup project");
      expect(tasksContent).toContain("task-1");
    });
  });

  describe("Scenario 2: Mock fallback path", () => {
    it("should load mock from disk when no agent1Output is provided", async () => {
      // Create a temporary mock file
      const mockDir = join(tempDir, "mocks");
      await mkdir(mockDir, { recursive: true });
      const mockFilePath = join(mockDir, "agent1.mock.json");
      await writeFile(
        mockFilePath,
        JSON.stringify(VALID_AGENT1_OUTPUT),
        "utf-8",
      );

      const mockLlm = new MockLlm(VALID_AGENT2_OUTPUT);
      const mockLoader = new JsonMockLoader(mockFilePath);
      const fileWriter = new KiroFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        mockLlm,
        mockLoader,
        fileWriter,
        ARCHITECT_SYSTEM_PROMPT,
      );

      // Execute without providing agent1Output — triggers mock fallback
      const result = await useCase.execute();

      expect(result).toEqual(VALID_AGENT2_OUTPUT);
      expect(result.techSteering.architecturePattern).toBe("Clean");
      expect(result.tasks[0]!.id).toBe("task-1");
    });
  });

  describe("Scenario 3: Validation failure path", () => {
    it("should throw ValidationError when LLM returns invalid JSON", async () => {
      const invalidOutput = {
        techSteering: {
          stack: [], // Invalid — min(1) requires at least one item
          architecturePattern: "Clean",
          solidBoundaries: [],
          securityGuards: [],
        },
        requirements: "",
        design: {
          domainEntities: [],
          mermaidDiagram: "",
          iamPolicySummary: [],
          awsCostProjection: {
            mvpMonthlyCostUsd: [],
            scaleMonthlyCostUsd: [],
          },
        },
        tasks: [],
      };

      const mockLlm = new MockLlm(invalidOutput);
      const mockLoader = new JsonMockLoader();
      const fileWriter = new KiroFileWriter();

      const useCase = new GenerateArchitectureSpecUseCase(
        mockLlm,
        mockLoader,
        fileWriter,
        ARCHITECT_SYSTEM_PROMPT,
      );

      await expect(
        useCase.execute({ agent1Output: VALID_AGENT1_OUTPUT }),
      ).rejects.toThrow(ValidationError);

      try {
        await useCase.execute({ agent1Output: VALID_AGENT1_OUTPUT });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.operation).toBe("output-validation");
        expect(validationError.category).toBe("VALIDATION");
      }
    });
  });
});
