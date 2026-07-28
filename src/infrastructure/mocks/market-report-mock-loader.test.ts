// Unit tests for MarketReportJsonMockLoader (Requirements 16.10, 21.7)
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, rm, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MarketReportJsonMockLoader } from "@/infrastructure/mocks/market-report-mock-loader";
import { ValidationError, FilesystemError } from "@/domain/errors";

const LONG_TEXT =
  "Small teams spend weeks producing the planning artifacts a build needs before any code exists.";

const validReport = {
  metadata: {
    product_name: "KiroSpec Studio",
    generated_date: "2025-01-15",
    agent_version: "1.0.0",
    input_source: "test",
  },
  executive_summary: LONG_TEXT,
  problem_statement: LONG_TEXT,
  proposed_solution: LONG_TEXT,
  market_analysis: {
    tam: { value: "$8.2B", source_type: "estimated" },
    sam: { value: "$1.4B", source_type: "estimated" },
    som: { value: "$45M", source_type: "estimated" },
    trends: ["AI adoption", "Remote work", "Low-code movement"],
    why_now: "Market timing is right",
  },
  competitive_landscape: {
    direct_competitors: [
      { name: "A", strengths: "s", weaknesses: "w", pricing: "$10" },
      { name: "B", strengths: "s", weaknesses: "w", pricing: "$20" },
      { name: "C", strengths: "s", weaknesses: "w", pricing: "free" },
    ],
    indirect_competitors: ["Generic AI tools"],
    differentiation: "End-to-end planning",
  },
  target_audience: {
    personas: [
      {
        name: "Ana",
        role: "Founder",
        type: "primary",
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
    { risk: "r1", category: "market", severity: "high", mitigation: "m1" },
    { risk: "r2", category: "technical", severity: "medium", mitigation: "m2" },
    { risk: "r3", category: "business", severity: "low", mitigation: "m3" },
  ],
  feasibility_scorecard: {
    viability: 8,
    desirability: 9,
    feasibility: 7,
    overall: 8,
    justification: {
      viability: "Strong signals",
      desirability: "Clear pain points",
      feasibility: "Proven tech stack",
    },
  },
  gtm_signals: {
    positioning: "AI-powered planning tool",
    pricing_model: "Freemium",
    distribution_channels: ["Product Hunt", "Dev communities"],
    traction_strategies: ["Content marketing", "Open-source community"],
  },
  recommendations: {
    verdict: "GO",
    summary: "Strong signals for market entry",
    assumptions_to_validate: ["Willingness to pay", "Team size threshold"],
    suggested_experiments: ["Landing page test"],
    handoff: {
      architecture: ["Serverless"],
      implementation: ["Start with MVP"],
    },
  },
};

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "market-mock-loader-test-"));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true }).catch(() => {});
});

describe("MarketReportJsonMockLoader", () => {
  it("loads and validates the repository mock file", async () => {
    const loader = new MarketReportJsonMockLoader();

    const report = await loader.load();

    expect(report.metadata.product_name).toBe("KiroSpec Studio");
    expect(report.competitive_landscape.direct_competitors.length).toBeGreaterThanOrEqual(3);
    expect(report.risk_assessment.length).toBeGreaterThanOrEqual(3);
  });

  it("does not include fields outside the declared schema", async () => {
    const loader = new MarketReportJsonMockLoader();

    const report = await loader.load();

    expect(report).not.toHaveProperty("internal_notes");
    expect(report).not.toHaveProperty("ai_confidence");
  });

  it("loads a valid file from an explicit path", async () => {
    const filePath = join(tempDir, "valid.json");
    await writeFile(filePath, JSON.stringify(validReport), "utf-8");

    const report = await new MarketReportJsonMockLoader(filePath).load();

    expect(report.metadata.product_name).toBe("KiroSpec Studio");
  });

  it("throws FilesystemError when the file is missing", async () => {
    const loader = new MarketReportJsonMockLoader(
      join(tempDir, "nonexistent.json"),
    );

    await expect(loader.load()).rejects.toThrow(FilesystemError);
    await expect(loader.load()).rejects.toMatchObject({
      category: "FILESYSTEM",
      operation: "mock-loading",
    });
  });

  it("throws ValidationError when the file contains invalid JSON", async () => {
    const filePath = join(tempDir, "broken.json");
    await writeFile(filePath, "{ not json !!!", "utf-8");

    const loader = new MarketReportJsonMockLoader(filePath);

    await expect(loader.load()).rejects.toThrow(ValidationError);
    await expect(loader.load()).rejects.toMatchObject({
      category: "VALIDATION",
      operation: "mock-loading",
    });
  });

  it("throws ValidationError with the field path when the report is malformed", async () => {
    const malformed = { ...validReport, risk_assessment: [] };
    const filePath = join(tempDir, "malformed.json");
    await writeFile(filePath, JSON.stringify(malformed), "utf-8");

    const loader = new MarketReportJsonMockLoader(filePath);

    try {
      await loader.load();
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).fieldPath).toContain("risk_assessment");
    }
  });
});
