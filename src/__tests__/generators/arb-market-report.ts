// src/__tests__/generators/arb-market-report.ts — Arbitrary MarketReport objects
import fc from "fast-check";
import type {
  MarketReport,
  MarketReportMetadata,
  MarketSizeEntry,
  MarketAnalysis,
  Competitor,
  CompetitiveLandscape,
  Persona,
  TargetAudience,
  ValueProposition,
  RiskAssessmentItem,
  FeasibilityScorecard,
  GtmSignals,
  Recommendations,
} from "@/domain/market-report";

// TAM/SAM/SOM values as arbitrary strings: "$2.1B", "unknown", empty, numbers, non-numeric
const arbMarketValue: fc.Arbitrary<string> = fc.oneof(
  fc.constant("$2.1B"),
  fc.constant("$450M"),
  fc.constant("unknown"),
  fc.constant(""),
  fc.nat().map(String),
  fc.string({ minLength: 0, maxLength: 30 }),
  fc.constant("N/A"),
  fc.constant("$0"),
);

const arbSourceType: fc.Arbitrary<"estimated" | "sourced"> = fc.constantFrom("estimated", "sourced");

const arbMarketSizeEntry: fc.Arbitrary<MarketSizeEntry> = fc.record({
  value: arbMarketValue,
  source_type: arbSourceType,
  source: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
});

const arbMetadata: fc.Arbitrary<MarketReportMetadata> = fc.record({
  product_name: fc.string({ minLength: 1, maxLength: 100 }),
  generated_date: fc.string({ minLength: 1, maxLength: 30 }),
  agent_version: fc.string({ minLength: 1, maxLength: 20 }),
  input_source: fc.string({ minLength: 1, maxLength: 100 }),
});

const arbMarketAnalysis: fc.Arbitrary<MarketAnalysis> = fc.record({
  tam: arbMarketSizeEntry,
  sam: arbMarketSizeEntry,
  som: arbMarketSizeEntry,
  trends: fc.array(fc.string({ minLength: 0, maxLength: 200 }), { minLength: 0, maxLength: 10 }),
  why_now: fc.string({ minLength: 0, maxLength: 500 }),
});

const arbCompetitor: fc.Arbitrary<Competitor> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 80 }),
  strengths: fc.string({ minLength: 0, maxLength: 200 }),
  weaknesses: fc.string({ minLength: 0, maxLength: 200 }),
  pricing: fc.string({ minLength: 0, maxLength: 100 }),
});

const arbCompetitiveLandscape: fc.Arbitrary<CompetitiveLandscape> = fc.record({
  direct_competitors: fc.array(arbCompetitor, { minLength: 0, maxLength: 10 }),
  indirect_competitors: fc.array(fc.string({ minLength: 0, maxLength: 100 }), { minLength: 0, maxLength: 8 }),
  differentiation: fc.string({ minLength: 0, maxLength: 300 }),
});

const arbPersona: fc.Arbitrary<Persona> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  role: fc.string({ minLength: 1, maxLength: 80 }),
  type: fc.option(fc.constantFrom("primary" as const, "secondary" as const), { nil: undefined }),
  company_type: fc.string({ minLength: 1, maxLength: 80 }),
  pain: fc.string({ minLength: 1, maxLength: 200 }),
  goal: fc.string({ minLength: 1, maxLength: 200 }),
  behavior: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
});

const arbTargetAudience: fc.Arbitrary<TargetAudience> = fc.record({
  personas: fc.array(arbPersona, { minLength: 0, maxLength: 5 }),
  jtbd: fc.array(fc.string({ minLength: 0, maxLength: 200 }), { minLength: 0, maxLength: 6 }),
});

const arbValueProposition: fc.Arbitrary<ValueProposition> = fc.record({
  customer_pains: fc.array(fc.string({ minLength: 0, maxLength: 200 }), { minLength: 0, maxLength: 6 }),
  customer_gains: fc.array(fc.string({ minLength: 0, maxLength: 200 }), { minLength: 0, maxLength: 6 }),
  pain_relievers: fc.array(fc.string({ minLength: 0, maxLength: 200 }), { minLength: 0, maxLength: 6 }),
  gain_creators: fc.array(fc.string({ minLength: 0, maxLength: 200 }), { minLength: 0, maxLength: 6 }),
});

const arbRiskItem: fc.Arbitrary<RiskAssessmentItem> = fc.record({
  risk: fc.string({ minLength: 1, maxLength: 200 }),
  category: fc.constantFrom("market" as const, "technical" as const, "business" as const),
  severity: fc.constantFrom("high" as const, "medium" as const, "low" as const),
  mitigation: fc.string({ minLength: 1, maxLength: 200 }),
});

const arbFeasibilityScorecard: fc.Arbitrary<FeasibilityScorecard> = fc.record({
  viability: fc.integer({ min: 1, max: 10 }),
  desirability: fc.integer({ min: 1, max: 10 }),
  feasibility: fc.integer({ min: 1, max: 10 }),
  overall: fc.integer({ min: 1, max: 10 }),
  justification: fc.record({
    viability: fc.string({ minLength: 1, maxLength: 200 }),
    desirability: fc.string({ minLength: 1, maxLength: 200 }),
    feasibility: fc.string({ minLength: 1, maxLength: 200 }),
  }),
});

const arbGtmSignals: fc.Arbitrary<GtmSignals> = fc.record({
  positioning: fc.string({ minLength: 0, maxLength: 200 }),
  pricing_model: fc.string({ minLength: 0, maxLength: 100 }),
  distribution_channels: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 0, maxLength: 5 }),
  traction_strategies: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 0, maxLength: 5 }),
});

const arbRecommendations: fc.Arbitrary<Recommendations> = fc.record({
  verdict: fc.constantFrom("GO" as const, "NO-GO" as const, "PIVOT" as const),
  summary: fc.string({ minLength: 0, maxLength: 300 }),
  assumptions_to_validate: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 0, maxLength: 5 }),
  suggested_experiments: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 0, maxLength: 4 }),
  handoff: fc.record({
    architecture: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 0, maxLength: 4 }),
    implementation: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 0, maxLength: 4 }),
  }),
});

export const arbMarketReport: fc.Arbitrary<MarketReport> = fc.record({
  metadata: arbMetadata,
  executive_summary: fc.string({ minLength: 0, maxLength: 600 }),
  problem_statement: fc.string({ minLength: 0, maxLength: 500 }),
  proposed_solution: fc.string({ minLength: 0, maxLength: 500 }),
  market_analysis: arbMarketAnalysis,
  competitive_landscape: arbCompetitiveLandscape,
  target_audience: arbTargetAudience,
  value_proposition: arbValueProposition,
  risk_assessment: fc.array(arbRiskItem, { minLength: 0, maxLength: 8 }),
  feasibility_scorecard: arbFeasibilityScorecard,
  gtm_signals: arbGtmSignals,
  recommendations: arbRecommendations,
});

export { arbMarketSizeEntry, arbCompetitor, arbPersona, arbRiskItem };
