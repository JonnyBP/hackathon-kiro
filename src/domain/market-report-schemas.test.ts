// Unit tests for MarketReportSchema (Requirements 21.9, 16.2)
import { describe, it, expect } from "vitest";
import { MarketReportSchema } from "@/domain/market-report-schemas";

const LONG_TEXT =
  "Small teams spend weeks producing the planning artifacts a build needs before any code exists.";

function validMarketReport() {
  return {
    metadata: {
      product_name: "KiroSpec Studio",
      generated_date: "2025-01-15",
      agent_version: "1.0.0",
      input_source: "user idea",
    },
    executive_summary: LONG_TEXT,
    problem_statement: LONG_TEXT,
    proposed_solution: LONG_TEXT,
    market_analysis: {
      tam: { value: "$8.2B", source_type: "estimated" as const },
      sam: {
        value: "$1.4B",
        source_type: "sourced" as const,
        source: "Industry report",
      },
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
      {
        risk: "r1",
        category: "market" as const,
        severity: "high" as const,
        mitigation: "m1",
      },
      {
        risk: "r2",
        category: "technical" as const,
        severity: "medium" as const,
        mitigation: "m2",
      },
      {
        risk: "r3",
        category: "business" as const,
        severity: "low" as const,
        mitigation: "m3",
      },
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
  };
}

describe("MarketReportSchema", () => {
  it("accepts a complete valid report", () => {
    const result = MarketReportSchema.safeParse(validMarketReport());
    expect(result.success).toBe(true);
  });

  it("accepts a persona without the optional type field", () => {
    const report = validMarketReport();
    delete (report.target_audience.personas[0] as { type?: string }).type;

    expect(MarketReportSchema.safeParse(report).success).toBe(true);
  });

  it("discards unknown extra fields without invalidating the report", () => {
    const withExtras = {
      ...validMarketReport(),
      internal_notes: "Anything the Panel_Mercado does not read",
      ai_confidence: 0.95,
    };

    const result = MarketReportSchema.safeParse(withExtras);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).not.toHaveProperty("internal_notes");
    expect(result.data).not.toHaveProperty("ai_confidence");
  });

  it("rejects a problem statement shorter than 50 characters", () => {
    const report = { ...validMarketReport(), problem_statement: "Too short" };

    const result = MarketReportSchema.safeParse(report);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]!.path).toEqual(["problem_statement"]);
  });

  it("rejects fewer than three direct competitors", () => {
    const report = validMarketReport();
    report.competitive_landscape.direct_competitors =
      report.competitive_landscape.direct_competitors.slice(0, 2);

    expect(MarketReportSchema.safeParse(report).success).toBe(false);
  });

  it("rejects an empty persona list", () => {
    const report = validMarketReport();
    report.target_audience.personas = [];

    expect(MarketReportSchema.safeParse(report).success).toBe(false);
  });

  it("rejects fewer than three risks", () => {
    const report = validMarketReport();
    report.risk_assessment = report.risk_assessment.slice(0, 2);

    expect(MarketReportSchema.safeParse(report).success).toBe(false);
  });

  it("rejects a source_type outside the declared enum", () => {
    const report = validMarketReport();
    (report.market_analysis.tam as { source_type: string }).source_type =
      "guessed";

    expect(MarketReportSchema.safeParse(report).success).toBe(false);
  });

  it("rejects a risk severity outside the three-level scale", () => {
    const report = validMarketReport();
    (report.risk_assessment[0] as { severity: string }).severity = "critical";

    expect(MarketReportSchema.safeParse(report).success).toBe(false);
  });

  it("rejects a missing top-level section", () => {
    const report = validMarketReport();
    delete (report as { market_analysis?: unknown }).market_analysis;

    expect(MarketReportSchema.safeParse(report).success).toBe(false);
  });
});
