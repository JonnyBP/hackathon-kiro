// Unit tests for GenerateMarketReportUseCase (Requirements 21.6, 21.7, 21.9)
import { describe, it, expect, vi } from "vitest";
import {
  GenerateMarketReportUseCase,
  LlmPort,
  MarketReportMockLoaderPort,
} from "@/application/generate-market-report";
import { MARKET_SYSTEM_PROMPT } from "@/prompts/market-agent";
import { MarketReport } from "@/domain/market-report";
import { Agent1Output } from "@/domain/types";
import { LlmError, ValidationError } from "@/domain/errors";

const LONG_TEXT =
  "Small teams spend weeks producing the planning artifacts a build needs before any code exists.";

const validBrief: Agent1Output = {
  projectName: "KiroSpec Studio",
  productVision: "Turn an idea into a validated plan",
  targetAudience: "Small software teams",
  valueProposition: "Weeks of planning in minutes",
  mvpFeatures: ["Market report"],
  expectedMetrics: {
    mvpMonthlyUsers: 500,
    scaleMonthlyUsers: 50000,
    peakConcurrentConnections: 200,
  },
};

const validReport = {
  metadata: {
    product_name: "KiroSpec Studio",
    generated_date: "2025-01-01",
    agent_version: "1.0.0",
    input_source: "test",
  },
  executive_summary: LONG_TEXT,
  problem_statement: LONG_TEXT,
  proposed_solution: LONG_TEXT,
  market_analysis: {
    tam: { value: "$8.2B", source_type: "estimated" as const },
    sam: { value: "$1.4B", source_type: "estimated" as const },
    som: { value: "$45M", source_type: "estimated" as const },
    trends: ["AI adoption", "Remote work", "Low-code movement"],
    why_now: "Market timing is right due to AI maturity",
  },
  competitive_landscape: {
    direct_competitors: [
      { name: "A", strengths: "s", weaknesses: "w", pricing: "$10" },
      { name: "B", strengths: "s", weaknesses: "w", pricing: "$20" },
      { name: "C", strengths: "s", weaknesses: "w", pricing: "free" },
    ],
    indirect_competitors: ["Generic AI tools"],
    differentiation: "End-to-end planning in minutes",
  },
  target_audience: {
    personas: [
      {
        name: "Ana",
        role: "Founder",
        type: "primary" as const,
        company_type: "Startup",
        pain: "No time",
        goal: "Ship fast",
      },
    ],
    jtbd: ["Validate ideas quickly", "Generate architecture specs"],
  },
  value_proposition: {
    customer_pains: ["Time waste", "Decision fatigue"],
    customer_gains: ["Speed", "Confidence"],
    pain_relievers: ["Automated planning", "Structured output"],
    gain_creators: ["AI-driven insights", "Multi-agent collaboration"],
  },
  risk_assessment: [
    { risk: "r1", category: "market" as const, severity: "high" as const, mitigation: "m1" },
    { risk: "r2", category: "technical" as const, severity: "medium" as const, mitigation: "m2" },
    { risk: "r3", category: "business" as const, severity: "low" as const, mitigation: "m3" },
  ],
  feasibility_scorecard: {
    viability: 8,
    desirability: 9,
    feasibility: 7,
    overall: 8,
    justification: {
      viability: "Strong market signals",
      desirability: "Clear pain points",
      feasibility: "Proven tech stack",
    },
  },
  gtm_signals: {
    positioning: "AI-powered planning tool",
    pricing_model: "Freemium",
    distribution_channels: ["Product Hunt", "Developer communities"],
    traction_strategies: ["Content marketing", "Open-source community"],
  },
  recommendations: {
    verdict: "GO" as const,
    summary: "Strong signals for market entry",
    assumptions_to_validate: ["Willingness to pay", "Team size threshold"],
    suggested_experiments: ["Landing page test"],
    handoff: {
      architecture: ["Serverless", "Event-driven"],
      implementation: ["Start with MVP features"],
    },
  },
} satisfies MarketReport;

function createLlm(response: unknown = validReport) {
  return { invoke: vi.fn().mockResolvedValue(response) } satisfies LlmPort & {
    invoke: ReturnType<typeof vi.fn>;
  };
}

function createRejectingLlm(error: unknown) {
  return { invoke: vi.fn().mockRejectedValue(error) };
}

function createMockLoader(report: MarketReport = validReport) {
  return {
    load: vi.fn().mockResolvedValue(report),
  } satisfies MarketReportMockLoaderPort & { load: ReturnType<typeof vi.fn> };
}

describe("GenerateMarketReportUseCase", () => {
  it("returns the validated report and invokes the LLM once", async () => {
    const llm = createLlm();
    const loader = createMockLoader();
    const useCase = new GenerateMarketReportUseCase(
      llm,
      loader,
      MARKET_SYSTEM_PROMPT,
    );

    const result = await useCase.execute({ brief: validBrief });

    expect(result).toEqual(validReport);
    expect(llm.invoke).toHaveBeenCalledOnce();
    expect(loader.load).not.toHaveBeenCalled();
  });

  it("passes the system prompt, the brief, the regions and the constraints", async () => {
    const llm = createLlm();
    const useCase = new GenerateMarketReportUseCase(
      llm,
      createMockLoader(),
      MARKET_SYSTEM_PROMPT,
    );

    await useCase.execute({
      brief: validBrief,
      regions: ["LATAM", "Europa"],
      constraints: "No vendor lock-in",
    });

    const [systemPrompt, userPrompt] = llm.invoke.mock.calls[0]! as [
      string,
      string,
    ];
    expect(systemPrompt).toBe(MARKET_SYSTEM_PROMPT);
    expect(userPrompt).toContain(JSON.stringify(validBrief));
    expect(userPrompt).toContain("Target regions: LATAM, Europa");
    expect(userPrompt).toContain("Constraints: No vendor lock-in");
  });

  it("discards fields outside the contract from the LLM output", async () => {
    const llm = createLlm({ ...validReport, unknown_extra_field: "extra" });
    const useCase = new GenerateMarketReportUseCase(
      llm,
      createMockLoader(),
      MARKET_SYSTEM_PROMPT,
    );

    const result = await useCase.execute({ brief: validBrief });

    expect(result).not.toHaveProperty("unknown_extra_field");
  });

  it("resolves from the mock loader without invoking the LLM in mock mode", async () => {
    const llm = createLlm();
    const loader = createMockLoader();
    const useCase = new GenerateMarketReportUseCase(
      llm,
      loader,
      MARKET_SYSTEM_PROMPT,
    );

    const result = await useCase.execute({ brief: validBrief, useMock: true });

    expect(result).toEqual(validReport);
    expect(loader.load).toHaveBeenCalledOnce();
    expect(llm.invoke).not.toHaveBeenCalled();
  });

  it("throws ValidationError with input-validation for an invalid brief", async () => {
    const llm = createLlm();
    const useCase = new GenerateMarketReportUseCase(
      llm,
      createMockLoader(),
      MARKET_SYSTEM_PROMPT,
    );

    try {
      await useCase.execute({
        brief: { ...validBrief, projectName: "" },
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).operation).toBe("input-validation");
    }
    expect(llm.invoke).not.toHaveBeenCalled();
  });

  it("throws ValidationError with output-validation when the LLM output fails the schema", async () => {
    const useCase = new GenerateMarketReportUseCase(
      createLlm({ metadata: { product_name: "X" } }),
      createMockLoader(),
      MARKET_SYSTEM_PROMPT,
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
    const useCase = new GenerateMarketReportUseCase(
      createRejectingLlm(new Error("Service Unavailable 503")),
      createMockLoader(),
      MARKET_SYSTEM_PROMPT,
    );

    await expect(useCase.execute({ brief: validBrief })).rejects.toMatchObject({
      category: "LLM_TRANSIENT",
      isTransient: true,
      operation: "llm-invocation",
    });
  });

  it("classifies other LLM failures as LLM_PERMANENT and keeps the project name in context", async () => {
    const useCase = new GenerateMarketReportUseCase(
      createRejectingLlm(new Error("401 Unauthorized")),
      createMockLoader(),
      MARKET_SYSTEM_PROMPT,
    );

    try {
      await useCase.execute({ brief: validBrief });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(LlmError);
      expect((error as LlmError).category).toBe("LLM_PERMANENT");
      expect((error as LlmError).context).toEqual({
        projectName: "KiroSpec Studio",
      });
    }
  });

  it("classifies non-Error rejections as permanent", async () => {
    const useCase = new GenerateMarketReportUseCase(
      createRejectingLlm("string failure"),
      createMockLoader(),
      MARKET_SYSTEM_PROMPT,
    );

    await expect(useCase.execute({ brief: validBrief })).rejects.toMatchObject({
      category: "LLM_PERMANENT",
      message: "Unknown LLM error",
    });
  });
});
