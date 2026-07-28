// Unit tests for GenerateComplianceReportUseCase (Requirements 21.6, 21.7, 21.9)
import { describe, it, expect, vi } from "vitest";
import {
  ComplianceReportMockLoaderPort,
  GenerateComplianceReportUseCase,
} from "@/application/generate-compliance-report";
import { COMPLIANCE_SYSTEM_PROMPT } from "@/prompts/compliance-agent";
import { ComplianceReport } from "@/domain/compliance-report";
import { Agent1Output, TechSteering } from "@/domain/types";
import { LlmError, ValidationError } from "@/domain/errors";

const validBrief: Agent1Output = {
  projectName: "KiroSpec Studio",
  productVision: "Turn an idea into a validated plan",
  targetAudience: "Small software teams",
  valueProposition: "Weeks of planning in minutes",
  mvpFeatures: ["Compliance review"],
  expectedMetrics: {
    mvpMonthlyUsers: 500,
    scaleMonthlyUsers: 50000,
    peakConcurrentConnections: 200,
  },
};

const validTechSteering: TechSteering = {
  stack: ["Next.js", "PostgreSQL"],
  architecturePattern: "Clean",
  solidBoundaries: [
    { principle: "SRP", rule: "One reason to change", layer: "Domain" },
  ],
  securityGuards: [
    { name: "Zod", description: "Validation", enforcement: "Handler" },
  ],
};

const validReport: ComplianceReport = {
  riskLevel: "medium",
  dataTypes: [{ name: "Email", collected: false }],
  regulations: [
    {
      name: "GDPR",
      status: "verification-required",
      reason: "EU territorial scope unknown",
    },
    {
      name: "Open-source licenses",
      status: "mandatory",
      reason: "Ships third-party dependencies",
    },
  ],
  checklist: [
    {
      category: "Legal Documents",
      items: [{ label: "Publish a privacy notice", checked: false }],
    },
  ],
};

function createLlm(response: unknown = validReport) {
  return { invoke: vi.fn().mockResolvedValue(response) };
}

function createRejectingLlm(error: unknown) {
  return { invoke: vi.fn().mockRejectedValue(error) };
}

function createMockLoader(report: ComplianceReport = validReport) {
  return {
    load: vi.fn().mockResolvedValue(report),
  } satisfies ComplianceReportMockLoaderPort & {
    load: ReturnType<typeof vi.fn>;
  };
}

describe("GenerateComplianceReportUseCase", () => {
  it("returns the validated report and invokes the LLM once", async () => {
    const llm = createLlm();
    const loader = createMockLoader();
    const useCase = new GenerateComplianceReportUseCase(
      llm,
      loader,
      COMPLIANCE_SYSTEM_PROMPT,
    );

    const result = await useCase.execute({ brief: validBrief });

    expect(result).toEqual(validReport);
    expect(llm.invoke).toHaveBeenCalledOnce();
    expect(loader.load).not.toHaveBeenCalled();
  });

  it("includes the technical facts and the regions in the user prompt when present", async () => {
    const llm = createLlm();
    const useCase = new GenerateComplianceReportUseCase(
      llm,
      createMockLoader(),
      COMPLIANCE_SYSTEM_PROMPT,
    );

    await useCase.execute({
      brief: validBrief,
      techSteering: validTechSteering,
      regions: ["Europa"],
    });

    const [systemPrompt, userPrompt] = llm.invoke.mock.calls[0]! as [
      string,
      string,
    ];
    expect(systemPrompt).toBe(COMPLIANCE_SYSTEM_PROMPT);
    const payload = JSON.parse(userPrompt) as Record<string, unknown>;
    expect(payload.brief).toEqual(validBrief);
    expect(payload.techSteering).toEqual(validTechSteering);
    expect(payload.regions).toEqual(["Europa"]);
  });

  it("omits absent facts from the user prompt instead of defaulting them", async () => {
    const llm = createLlm();
    const useCase = new GenerateComplianceReportUseCase(
      llm,
      createMockLoader(),
      COMPLIANCE_SYSTEM_PROMPT,
    );

    await useCase.execute({ brief: validBrief });

    const userPrompt = llm.invoke.mock.calls[0]![1] as string;
    const payload = JSON.parse(userPrompt) as Record<string, unknown>;
    expect(payload).not.toHaveProperty("techSteering");
    expect(payload).not.toHaveProperty("regions");
  });

  it("resolves from the mock loader without invoking the LLM in mock mode", async () => {
    const llm = createLlm();
    const loader = createMockLoader();
    const useCase = new GenerateComplianceReportUseCase(
      llm,
      loader,
      COMPLIANCE_SYSTEM_PROMPT,
    );

    const result = await useCase.execute({ brief: validBrief, useMock: true });

    expect(result).toEqual(validReport);
    expect(loader.load).toHaveBeenCalledOnce();
    expect(llm.invoke).not.toHaveBeenCalled();
  });

  it("throws ValidationError with input-validation for an invalid brief", async () => {
    const llm = createLlm();
    const useCase = new GenerateComplianceReportUseCase(
      llm,
      createMockLoader(),
      COMPLIANCE_SYSTEM_PROMPT,
    );

    try {
      await useCase.execute({ brief: { ...validBrief, mvpFeatures: [] } });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).operation).toBe("input-validation");
    }
    expect(llm.invoke).not.toHaveBeenCalled();
  });

  it("throws ValidationError with output-validation when the LLM output fails the schema", async () => {
    const useCase = new GenerateComplianceReportUseCase(
      createLlm({ riskLevel: "critical", dataTypes: [], regulations: [], checklist: [] }),
      createMockLoader(),
      COMPLIANCE_SYSTEM_PROMPT,
    );

    try {
      await useCase.execute({ brief: validBrief });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).operation).toBe("output-validation");
    }
  });

  it("classifies transient LLM failures as LLM_TRANSIENT", async () => {
    const useCase = new GenerateComplianceReportUseCase(
      createRejectingLlm(new Error("socket timeout")),
      createMockLoader(),
      COMPLIANCE_SYSTEM_PROMPT,
    );

    await expect(useCase.execute({ brief: validBrief })).rejects.toMatchObject({
      category: "LLM_TRANSIENT",
      isTransient: true,
    });
  });

  it("classifies other LLM failures as LLM_PERMANENT", async () => {
    const useCase = new GenerateComplianceReportUseCase(
      createRejectingLlm(new Error("400 Bad Request")),
      createMockLoader(),
      COMPLIANCE_SYSTEM_PROMPT,
    );

    try {
      await useCase.execute({ brief: validBrief });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(LlmError);
      expect((error as LlmError).category).toBe("LLM_PERMANENT");
    }
  });
});
