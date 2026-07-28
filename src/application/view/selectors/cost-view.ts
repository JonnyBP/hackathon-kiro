// src/application/view/selectors/cost-view.ts — Cost section view selector (pure TS, no React)

import type { CostProjection, ExpectedMetrics } from "@/domain/types";

export interface CostRowView {
  servicio: string;
  mvp: number | null;
  escala: number | null;
  diferencia: string;
}

export interface CostViewResult {
  mvpTotal: number;
  escalaTotal: number;
  mvpUsuarios: number | null;
  escalaUsuarios: number | null;
  barrasMvpPct: number;
  barrasEscalaPct: number;
  filas: CostRowView[];
  totalRow: CostRowView;
  hayDesglose: boolean;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatDiferencia(mvp: number | null, escala: number | null): string {
  if (mvp === null || escala === null) return "—";
  const diff = round2(escala - mvp);
  if (diff === 0) return "—";
  if (diff > 0) return `+${diff.toFixed(2)}`;
  // Use minus sign (−) U+2212 for negative
  return `−${Math.abs(diff).toFixed(2)}`;
}

export function calcularVistaDeCostos(costProjection: CostProjection, metrics: ExpectedMetrics): CostViewResult {
  const mvpServices = costProjection.mvpMonthlyCostUsd ?? [];
  const escalaServices = costProjection.scaleMonthlyCostUsd ?? [];

  // Totals
  const mvpTotal = round2(mvpServices.reduce((sum, s) => sum + s.monthlyCostUsd, 0));
  const escalaTotal = round2(escalaServices.reduce((sum, s) => sum + s.monthlyCostUsd, 0));

  // Users
  const mvpUsuarios = metrics.mvpMonthlyUsers > 0 ? metrics.mvpMonthlyUsers : null;
  const escalaUsuarios = metrics.scaleMonthlyUsers > 0 ? metrics.scaleMonthlyUsers : null;

  // Bar percentages
  const maxTotal = Math.max(mvpTotal, escalaTotal);
  const barrasMvpPct = maxTotal > 0 ? (mvpTotal / maxTotal) * 100 : 0;
  const barrasEscalaPct = maxTotal > 0 ? (escalaTotal / maxTotal) * 100 : 0;

  // Build rows: union of services by name (MVP order first, then Escala-only)
  const mvpMap = new Map<string, number>();
  for (const s of mvpServices) {
    mvpMap.set(s.service, s.monthlyCostUsd);
  }

  const escalaMap = new Map<string, number>();
  for (const s of escalaServices) {
    escalaMap.set(s.service, s.monthlyCostUsd);
  }

  const seen = new Set<string>();
  const filas: CostRowView[] = [];

  // MVP order first
  for (const s of mvpServices) {
    if (seen.has(s.service)) continue;
    seen.add(s.service);
    const mvpVal = mvpMap.get(s.service) ?? null;
    const escalaVal = escalaMap.get(s.service) ?? null;
    filas.push({
      servicio: s.service,
      mvp: mvpVal,
      escala: escalaVal,
      diferencia: formatDiferencia(mvpVal, escalaVal),
    });
  }

  // Escala-only services
  for (const s of escalaServices) {
    if (seen.has(s.service)) continue;
    seen.add(s.service);
    const mvpVal = mvpMap.get(s.service) ?? null;
    const escalaVal = escalaMap.get(s.service) ?? null;
    filas.push({
      servicio: s.service,
      mvp: mvpVal,
      escala: escalaVal,
      diferencia: formatDiferencia(mvpVal, escalaVal),
    });
  }

  // Total row
  const totalRow: CostRowView = {
    servicio: "Total",
    mvp: mvpTotal,
    escala: escalaTotal,
    diferencia: formatDiferencia(mvpTotal, escalaTotal),
  };

  const hayDesglose = filas.length > 0;

  return {
    mvpTotal,
    escalaTotal,
    mvpUsuarios,
    escalaUsuarios,
    barrasMvpPct,
    barrasEscalaPct,
    filas,
    totalRow,
    hayDesglose,
  };
}
