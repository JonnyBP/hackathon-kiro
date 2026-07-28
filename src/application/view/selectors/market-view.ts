// src/application/view/selectors/market-view.ts — Market section view selector (pure TS, no React)

import type { MarketReport, RiskAssessmentItem } from "@/domain/market-report";
import type { Agent1Output } from "@/domain/types";

export interface MarketSizeView {
  valor: string;
  base: string;
  magnitud: number | null;
}

export interface CompetidorView {
  name: string;
  strengths: string;
  weaknesses: string;
  pricing: string;
}

export interface RiesgoView {
  risk: string;
  category: string;
  severity: string;
  mitigation: string;
}

export interface MarketViewResult {
  nombreProyecto: string;
  audiencia: string;
  problema: string;
  propuestaDeValor: string;
  tam: MarketSizeView;
  sam: MarketSizeView;
  som: MarketSizeView;
  barrasVisibles: boolean;
  anchoTam: number;
  anchoSam: number;
  anchoSom: number;
  competidores: CompetidorView[];
  competidoresOmitidos: number;
  mvpFeatures: string[];
  featuresOmitidas: number;
  riesgos: RiesgoView[];
}

function extractMagnitud(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseMarketSize(entry: { value: string; source_type: string; source?: string }): MarketSizeView {
  return {
    valor: entry.value,
    base: entry.source_type === "sourced" && entry.source ? entry.source : entry.source_type,
    magnitud: extractMagnitud(entry.value),
  };
}

const CATEGORY_ES: Record<string, string> = {
  market: "Mercado",
  technical: "Técnico",
  business: "Negocio",
};

const SEVERITY_ES: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

function translateRisk(item: RiskAssessmentItem): RiesgoView {
  return {
    risk: item.risk,
    category: CATEGORY_ES[item.category] ?? item.category,
    severity: SEVERITY_ES[item.severity] ?? item.severity,
    mitigation: item.mitigation,
  };
}

export function calcularVistaDeMarket(report: MarketReport, brief: Agent1Output): MarketViewResult {
  // Audience from primary persona
  const primaryPersona = report.target_audience.personas.find((p) => p.type === "primary") ?? report.target_audience.personas[0];
  const audiencia = primaryPersona
    ? `${primaryPersona.role} · ${primaryPersona.company_type}`
    : "";

  // Market sizes
  const tam = parseMarketSize(report.market_analysis.tam);
  const sam = parseMarketSize(report.market_analysis.sam);
  const som = parseMarketSize(report.market_analysis.som);

  // Bars visibility
  const barrasVisibles =
    tam.magnitud !== null &&
    sam.magnitud !== null &&
    som.magnitud !== null &&
    Number.isFinite(tam.magnitud) &&
    Number.isFinite(sam.magnitud) &&
    Number.isFinite(som.magnitud);

  // Bar widths as percentages relative to max
  let anchoTam = 0;
  let anchoSam = 0;
  let anchoSom = 0;
  if (barrasVisibles) {
    const max = Math.max(tam.magnitud!, sam.magnitud!, som.magnitud!);
    if (max > 0) {
      anchoTam = (tam.magnitud! / max) * 100;
      anchoSam = (sam.magnitud! / max) * 100;
      anchoSom = (som.magnitud! / max) * 100;
    }
  }

  // Competitors sliced to 8
  const allCompetitors = report.competitive_landscape.direct_competitors;
  const competidores: CompetidorView[] = allCompetitors.slice(0, 8).map((c) => ({
    name: c.name,
    strengths: c.strengths,
    weaknesses: c.weaknesses,
    pricing: c.pricing,
  }));
  const competidoresOmitidos = Math.max(0, allCompetitors.length - 8);

  // MVP features sliced to 10
  const allFeatures = brief.mvpFeatures ?? [];
  const mvpFeatures = allFeatures.slice(0, 10);
  const featuresOmitidas = Math.max(0, allFeatures.length - 10);

  // Risks sliced to 3
  const riesgos = (report.risk_assessment ?? []).slice(0, 3).map(translateRisk);

  return {
    nombreProyecto: report.metadata.product_name,
    audiencia,
    problema: report.problem_statement,
    propuestaDeValor: report.proposed_solution,
    tam,
    sam,
    som,
    barrasVisibles,
    anchoTam,
    anchoSam,
    anchoSom,
    competidores,
    competidoresOmitidos,
    mvpFeatures,
    featuresOmitidas,
    riesgos,
  };
}
