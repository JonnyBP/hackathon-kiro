// src/application/view/report-adapter.ts — Data adapters for agent responses
import type { EstadoSeccion, IdSeccion } from "@/domain/view-model";
import { Agent2OutputSchema, Agent4OutputSchema } from "@/domain/schemas";
import { MarketReportSchema } from "@/domain/market-report-schemas";
import { ComplianceReportSchema } from "@/domain/compliance-report-schemas";

// ─── Diagnostic type ─────────────────────────────────────────────────────────

export type DiagnosticoValidacion = {
  readonly seccion: IdSeccion;
  readonly campo: string;
};

// ─── Text normalization ──────────────────────────────────────────────────────

/**
 * Trims whitespace and collapses internal whitespace runs to a single space.
 */
export function normalizarTexto(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function seccionNoDisponible(motivo: "esquema_invalido"): EstadoSeccion<unknown> {
  return { estado: "no_disponible", motivo };
}

function seccionDisponible<T>(datos: T): EstadoSeccion<T> {
  return { estado: "disponible", datos };
}

/**
 * Deep-normalizes string values within an object tree:
 * - Trims strings and collapses internal whitespace
 * - Converts numeric strings to numbers
 */
function normalizarDatos(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = normalizarTexto(value);
    // Convert numeric strings to numbers
    const asNum = Number(trimmed);
    if (trimmed !== "" && !isNaN(asNum)) {
      return asNum;
    }
    return trimmed;
  }
  if (Array.isArray(value)) {
    return value.map(normalizarDatos);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = normalizarDatos(v);
    }
    return result;
  }
  return value;
}

function logDiagnostico(seccion: IdSeccion, campo: string): void {
  const diag: DiagnosticoValidacion = { seccion, campo };
  console.warn("[report-adapter] Validation failed:", diag);
}

// ─── Agent 2 adapter (techSteering, costProjection, tasks) ───────────────────

export function adaptarRespuestaAgente2(raw: unknown): {
  tecnico: EstadoSeccion<unknown>;
  costos: EstadoSeccion<unknown>;
  tareas: EstadoSeccion<unknown>;
} {
  const normalized = normalizarDatos(raw);
  const result = Agent2OutputSchema.safeParse(normalized);

  if (result.success) {
    return {
      tecnico: seccionDisponible(result.data.techSteering),
      costos: seccionDisponible(result.data.design.awsCostProjection),
      tareas: seccionDisponible(result.data.tasks),
    };
  }

  // Full schema failed — try partial sub-validations
  const obj = typeof normalized === "object" && normalized !== null
    ? normalized as Record<string, unknown>
    : null;

  let tecnico: EstadoSeccion<unknown> = seccionNoDisponible("esquema_invalido");
  let costos: EstadoSeccion<unknown> = seccionNoDisponible("esquema_invalido");
  let tareas: EstadoSeccion<unknown> = seccionNoDisponible("esquema_invalido");

  if (obj) {
    // Try techSteering independently
    const techResult = Agent2OutputSchema.shape.techSteering.safeParse(obj["techSteering"]);
    if (techResult.success) {
      tecnico = seccionDisponible(techResult.data);
    } else {
      logDiagnostico("tecnico", "techSteering");
    }

    // Try cost projection independently
    const designObj = typeof obj["design"] === "object" && obj["design"] !== null
      ? obj["design"] as Record<string, unknown>
      : null;
    if (designObj) {
      const costResult = Agent2OutputSchema.shape.design.shape.awsCostProjection.safeParse(
        designObj["awsCostProjection"],
      );
      if (costResult.success) {
        costos = seccionDisponible(costResult.data);
      } else {
        logDiagnostico("costos", "design.awsCostProjection");
      }
    } else {
      logDiagnostico("costos", "design");
    }

    // Try tasks independently
    const tasksResult = Agent2OutputSchema.shape.tasks.safeParse(obj["tasks"]);
    if (tasksResult.success) {
      tareas = seccionDisponible(tasksResult.data);
    } else {
      logDiagnostico("tareas", "tasks");
    }
  } else {
    logDiagnostico("tecnico", "root");
    logDiagnostico("costos", "root");
    logDiagnostico("tareas", "root");
  }

  return { tecnico, costos, tareas };
}

// ─── Market report adapter ───────────────────────────────────────────────────

export function adaptarRespuestaMercado(raw: unknown): EstadoSeccion<unknown> {
  const normalized = normalizarDatos(raw);
  const result = MarketReportSchema.safeParse(normalized);

  if (result.success) {
    return seccionDisponible(result.data);
  }

  logDiagnostico("mercado", "root");
  return seccionNoDisponible("esquema_invalido");
}

// ─── Compliance report adapter ───────────────────────────────────────────────

export function adaptarRespuestaCompliance(raw: unknown): EstadoSeccion<unknown> {
  const normalized = normalizarDatos(raw);
  const result = ComplianceReportSchema.safeParse(normalized);

  if (result.success) {
    return seccionDisponible(result.data);
  }

  logDiagnostico("compliance", "root");
  return seccionNoDisponible("esquema_invalido");
}

// ─── DevSecOps report adapter ────────────────────────────────────────────────

export function adaptarRespuestaDevSecOps(raw: unknown): EstadoSeccion<unknown> {
  const normalized = normalizarDatos(raw);
  const result = Agent4OutputSchema.safeParse(normalized);

  if (result.success) {
    return seccionDisponible(result.data);
  }

  logDiagnostico("devsecops", "root");
  return seccionNoDisponible("esquema_invalido");
}
