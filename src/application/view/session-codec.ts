// src/application/view/session-codec.ts — Session storage codec for EstadoUI
import type {
  EstadoUI,
  IdSeccion,
  FuenteSeccion,
  EntradaFormulario,
  Suposicion,
  EstadoSeccion,
} from "@/domain/view-model";
import { SECCIONES } from "@/domain/view-model";
import { crearEstadoInicial } from "./generation-reducer";

// ─── Schema version ──────────────────────────────────────────────────────────

export const VERSION_ESQUEMA = 1;

// ─── Persisted shape ─────────────────────────────────────────────────────────

interface EstadoPersistido {
  versionEsquema: number;
  entrada: EntradaFormulario;
  suposiciones: readonly Suposicion[];
  reporte: Record<string, unknown>;
  pestanaActiva: IdSeccion;
  intentos: Record<FuenteSeccion, number>;
  mascotaOculta: boolean;
}

// ─── Encode ──────────────────────────────────────────────────────────────────

/**
 * Encodes the UI state to a JSON string suitable for sessionStorage.
 * Only persists sections in `disponible` state; `pendiente` and `no_disponible` are excluded.
 */
export function codificarEstado(state: EstadoUI): string {
  const reportePersistido: Record<string, unknown> = {
    brief: state.reporte.brief,
  };

  for (const seccion of SECCIONES) {
    const seccionState = state.reporte[seccion];
    if (seccionState.estado === "disponible") {
      reportePersistido[seccion] = { estado: "disponible", datos: seccionState.datos };
    }
    // pendiente and no_disponible are NOT stored
  }

  const persisted: EstadoPersistido = {
    versionEsquema: VERSION_ESQUEMA,
    entrada: state.entrada,
    suposiciones: state.suposiciones,
    reporte: reportePersistido,
    pestanaActiva: state.pestanaActiva,
    intentos: state.intentos,
    mascotaOculta: state.mascotaOculta,
  };

  return JSON.stringify(persisted);
}

// ─── Decode ──────────────────────────────────────────────────────────────────

/**
 * Decodes a JSON string from sessionStorage back into an EstadoUI.
 * Returns null on any failure (bad JSON, wrong version, truncated, missing fields).
 * NEVER throws.
 */
export function decodificarEstado(raw: string | null): EstadoUI | null {
  if (raw === null) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;

    // Version check
    if (obj["versionEsquema"] !== VERSION_ESQUEMA) return null;

    // Validate required fields exist
    if (!obj["entrada"] || typeof obj["entrada"] !== "object") return null;
    if (!Array.isArray(obj["suposiciones"])) return null;
    if (!obj["reporte"] || typeof obj["reporte"] !== "object") return null;
    if (typeof obj["pestanaActiva"] !== "string") return null;
    if (!obj["intentos"] || typeof obj["intentos"] !== "object") return null;
    if (typeof obj["mascotaOculta"] !== "boolean") return null;

    // Validate pestanaActiva is a valid section
    if (!SECCIONES.includes(obj["pestanaActiva"] as IdSeccion)) return null;

    const entrada = obj["entrada"] as EntradaFormulario;
    const suposiciones = obj["suposiciones"] as Suposicion[];
    const reporteRaw = obj["reporte"] as Record<string, unknown>;
    const pestanaActiva = obj["pestanaActiva"] as IdSeccion;
    const intentos = obj["intentos"] as Record<FuenteSeccion, number>;
    const mascotaOculta = obj["mascotaOculta"] as boolean;

    // Rebuild the full report — sections not stored default to pendiente
    const base = crearEstadoInicial();
    const reporte = { ...base.reporte };

    // Restore brief if present
    if (reporteRaw["brief"] !== undefined) {
      (reporte as Record<string, unknown>)["brief"] = reporteRaw["brief"];
    }

    // Restore available sections
    for (const seccion of SECCIONES) {
      const stored = reporteRaw[seccion];
      if (
        stored !== undefined &&
        typeof stored === "object" &&
        stored !== null &&
        (stored as Record<string, unknown>)["estado"] === "disponible" &&
        "datos" in (stored as object)
      ) {
        (reporte as Record<string, unknown>)[seccion] = {
          estado: "disponible",
          datos: (stored as { datos: unknown }).datos,
        } as EstadoSeccion<unknown>;
      }
      // Otherwise remains pendiente (set by crearEstadoInicial)
    }

    // Determine generation state — if any section is restored as disponible,
    // and some remain pendiente, the hook will handle re-fetching.
    // We derive the state based on what was restored.
    const hasPendiente = SECCIONES.some((s) => reporte[s].estado === "pendiente");
    const hasDisponible = SECCIONES.some((s) => reporte[s].estado === "disponible");

    let estadoGeneracion: EstadoUI["estadoGeneracion"] = "inactivo";
    if (hasDisponible && hasPendiente) {
      // Partially restored — hook will re-fetch pending sections
      estadoGeneracion = "en_curso";
    } else if (hasDisponible && !hasPendiente) {
      estadoGeneracion = "completado";
    }

    return {
      versionEsquema: 1,
      pantalla: hasDisponible ? "generacion" : "entrada",
      estadoGeneracion,
      entrada,
      suposiciones,
      reporte,
      pestanaActiva,
      intentos,
      mascotaOculta,
    };
  } catch {
    // JSON.parse failed or any other error
    return null;
  }
}
