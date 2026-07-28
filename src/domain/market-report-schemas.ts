// src/domain/market-report-schemas.ts — Zod schemas for PM Market Strategy Report
import { z } from "zod";

const MarketSizeEntrySchema = z.object({
  value: z.string(),
  source_type: z.enum(["estimated", "sourced"]),
  source: z.string().optional(),
});

const MarketAnalysisSchema = z.object({
  tam: MarketSizeEntrySchema,
  sam: MarketSizeEntrySchema,
  som: MarketSizeEntrySchema,
  trends: z.array(z.string()).min(3),
  why_now: z.string(),
});

const CompetitorSchema = z.object({
  name: z.string(),
  strengths: z.string(),
  weaknesses: z.string(),
  pricing: z.string(),
});

const CompetitiveLandscapeSchema = z.object({
  direct_competitors: z.array(CompetitorSchema).min(3),
  indirect_competitors: z.array(z.string()),
  differentiation: z.string(),
});

const PersonaSchema = z.object({
  name: z.string(),
  role: z.string(),
  type: z.enum(["primary", "secondary"]).optional(),
  company_type: z.string(),
  pain: z.string(),
  goal: z.string(),
  behavior: z.string().optional(),
});

const TargetAudienceSchema = z.object({
  personas: z.array(PersonaSchema).min(1),
  jtbd: z.array(z.string()).min(2),
});

const ValuePropositionSchema = z.object({
  customer_pains: z.array(z.string()).min(2),
  customer_gains: z.array(z.string()).min(2),
  pain_relievers: z.array(z.string()).min(2),
  gain_creators: z.array(z.string()).min(2),
});

const RiskAssessmentItemSchema = z.object({
  risk: z.string(),
  category: z.enum(["market", "technical", "business"]),
  severity: z.enum(["high", "medium", "low"]),
  mitigation: z.string(),
});

const FeasibilityJustificationSchema = z.object({
  viability: z.string(),
  desirability: z.string(),
  feasibility: z.string(),
});

const FeasibilityScorecardSchema = z.object({
  viability: z.number().min(1).max(10),
  desirability: z.number().min(1).max(10),
  feasibility: z.number().min(1).max(10),
  overall: z.number().min(1).max(10),
  justification: FeasibilityJustificationSchema,
});

const GtmSignalsSchema = z.object({
  positioning: z.string(),
  pricing_model: z.string(),
  distribution_channels: z.array(z.string()).min(2),
  traction_strategies: z.array(z.string()).min(2),
});

const RecommendationsHandoffSchema = z.object({
  architecture: z.array(z.string()),
  implementation: z.array(z.string()),
});

const RecommendationsSchema = z.object({
  verdict: z.enum(["GO", "NO-GO", "PIVOT"]),
  summary: z.string(),
  assumptions_to_validate: z.array(z.string()).min(2),
  suggested_experiments: z.array(z.string()).min(1),
  handoff: RecommendationsHandoffSchema,
});

const MarketReportMetadataSchema = z.object({
  product_name: z.string(),
  generated_date: z.string(),
  agent_version: z.string(),
  input_source: z.string(),
});

export const MarketReportSchema = z.object({
  metadata: MarketReportMetadataSchema,
  executive_summary: z.string().min(50).max(500),
  problem_statement: z.string().min(50),
  proposed_solution: z.string().min(50),
  market_analysis: MarketAnalysisSchema,
  competitive_landscape: CompetitiveLandscapeSchema,
  target_audience: TargetAudienceSchema,
  value_proposition: ValuePropositionSchema,
  risk_assessment: z.array(RiskAssessmentItemSchema).min(3),
  feasibility_scorecard: FeasibilityScorecardSchema,
  gtm_signals: GtmSignalsSchema,
  recommendations: RecommendationsSchema,
});

export type MarketReportParsed = z.infer<typeof MarketReportSchema>;
