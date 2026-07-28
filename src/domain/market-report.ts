// src/domain/market-report.ts — TypeScript interfaces for PM Market Strategy Report

export interface MarketReportMetadata {
  product_name: string;
  generated_date: string;
  agent_version: string;
  input_source: string;
}

export interface MarketSizeEntry {
  value: string;
  source_type: "estimated" | "sourced";
  source?: string;
}

export interface MarketAnalysis {
  tam: MarketSizeEntry;
  sam: MarketSizeEntry;
  som: MarketSizeEntry;
  trends: string[];
  why_now: string;
}

export interface Competitor {
  name: string;
  strengths: string;
  weaknesses: string;
  pricing: string;
}

export interface CompetitiveLandscape {
  direct_competitors: Competitor[];
  indirect_competitors: string[];
  differentiation: string;
}

export interface Persona {
  name: string;
  role: string;
  type?: "primary" | "secondary";
  company_type: string;
  pain: string;
  goal: string;
  behavior?: string;
}

export interface TargetAudience {
  personas: Persona[];
  jtbd: string[];
}

export interface ValueProposition {
  customer_pains: string[];
  customer_gains: string[];
  pain_relievers: string[];
  gain_creators: string[];
}

export interface RiskAssessmentItem {
  risk: string;
  category: "market" | "technical" | "business";
  severity: "high" | "medium" | "low";
  mitigation: string;
}

export type RiskAssessment = RiskAssessmentItem[];

export interface FeasibilityJustification {
  viability: string;
  desirability: string;
  feasibility: string;
}

export interface FeasibilityScorecard {
  viability: number;
  desirability: number;
  feasibility: number;
  overall: number;
  justification: FeasibilityJustification;
}

export interface GtmSignals {
  positioning: string;
  pricing_model: string;
  distribution_channels: string[];
  traction_strategies: string[];
}

export interface RecommendationsHandoff {
  architecture: string[];
  implementation: string[];
}

export interface Recommendations {
  verdict: "GO" | "NO-GO" | "PIVOT";
  summary: string;
  assumptions_to_validate: string[];
  suggested_experiments: string[];
  handoff: RecommendationsHandoff;
}

export interface MarketReport {
  metadata: MarketReportMetadata;
  executive_summary: string;
  problem_statement: string;
  proposed_solution: string;
  market_analysis: MarketAnalysis;
  competitive_landscape: CompetitiveLandscape;
  target_audience: TargetAudience;
  value_proposition: ValueProposition;
  risk_assessment: RiskAssessment;
  feasibility_scorecard: FeasibilityScorecard;
  gtm_signals: GtmSignals;
  recommendations: Recommendations;
}
