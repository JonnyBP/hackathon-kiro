/**
 * assumptions-model.ts — Lógica pura del Panel de Suposiciones (sin React).
 * Decisión D9: lógica probable vive en application/view/.
 */

import type { Suposicion, EntradaFormulario } from "@/domain/view-model";
import type { Agent1Output } from "@/domain/types";

// ─── Creación ────────────────────────────────────────────────────────────────

/**
 * Crea el arreglo de suposiciones a partir de los pares clave/valor del Pipeline.
 * Máximo 12 filas, en el orden entregado (estable entre generaciones).
 */
export function crearSuposiciones(
  raw: ReadonlyArray<{ clave: string; valor: string }>
): Suposicion[] {
  const limitadas = raw.slice(0, 12);
  return limitadas.map((item) => ({
    clave: item.clave,
    valorInferido: item.valor,
    valorActual: item.valor,
    modificada: false,
  }));
}

// ─── Edición ─────────────────────────────────────────────────────────────────

export interface ResultadoEdicion {
  suposiciones: Suposicion[];
  error: string | null;
}

/**
 * Edita el valor actual de una suposición identificada por su clave.
 * - Rechaza valor vacío o compuesto solo de espacios con un mensaje de error.
 * - Marca la fila como modificada.
 * - Trunca a 120 caracteres.
 */
export function editarSuposicion(
  suposiciones: readonly Suposicion[],
  clave: string,
  nuevoValor: string
): ResultadoEdicion {
  const trimmed = nuevoValor.trim();
  if (trimmed.length === 0) {
    return {
      suposiciones: [...suposiciones],
      error: "La suposición no puede quedar sin valor",
    };
  }

  // Truncar a 120 caracteres (code points)
  const valorFinal = [...nuevoValor].length > 120
    ? [...nuevoValor].slice(0, 120).join("")
    : nuevoValor;

  const nuevas = suposiciones.map((s) => {
    if (s.clave !== clave) return s;
    return {
      ...s,
      valorActual: valorFinal,
      modificada: valorFinal !== s.valorInferido,
    };
  });

  return { suposiciones: nuevas, error: null };
}

// ─── Restauración ────────────────────────────────────────────────────────────

/**
 * Restaura una suposición a su valor inferido y retira la marca de modificada.
 */
export function restaurarSuposicion(
  suposiciones: readonly Suposicion[],
  clave: string
): Suposicion[] {
  return suposiciones.map((s) => {
    if (s.clave !== clave) return s;
    return {
      ...s,
      valorActual: s.valorInferido,
      modificada: false,
    };
  });
}

// ─── Construcción del Brief Confirmado ───────────────────────────────────────

/**
 * Construye el brief confirmado (Agent1Output) fusionando la entrada del formulario
 * con los valores actuales de las suposiciones.
 *
 * Las suposiciones corresponden a los campos que el sistema infirió:
 * - targetAudience, valueProposition, mvpFeatures, expectedMetrics
 */
export function construirBriefConfirmado(
  entrada: EntradaFormulario,
  suposiciones: readonly Suposicion[]
): Agent1Output {
  // Buscar valores en suposiciones por clave
  const buscar = (clave: string): string | undefined => {
    const sup = suposiciones.find((s) => s.clave === clave);
    return sup?.valorActual;
  };

  // Intentar parsear mvpFeatures como JSON array o como lista separada por comas
  const mvpRaw = buscar("mvpFeatures") ?? buscar("Características MVP") ?? "";
  let mvpFeatures: string[];
  try {
    const parsed = JSON.parse(mvpRaw);
    mvpFeatures = Array.isArray(parsed) ? parsed.map(String) : [mvpRaw];
  } catch {
    mvpFeatures = mvpRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  // Intentar parsear expectedMetrics
  const metricsRaw = buscar("expectedMetrics") ?? buscar("Métricas esperadas") ?? "";
  let expectedMetrics = { mvpMonthlyUsers: 1000, scaleMonthlyUsers: 10000, peakConcurrentConnections: 100 };
  try {
    const parsed = JSON.parse(metricsRaw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.mvpMonthlyUsers === "number"
    ) {
      expectedMetrics = parsed;
    }
  } catch {
    // Mantener valores por defecto
  }

  return {
    projectName: entrada.nombreProyecto || buscar("projectName") || buscar("Nombre del proyecto") || "Mi Proyecto",
    productVision: entrada.idea,
    targetAudience: entrada.publicoObjetivo || buscar("targetAudience") || buscar("Público objetivo") || "",
    valueProposition: buscar("valueProposition") || buscar("Propuesta de valor") || "",
    mvpFeatures: mvpFeatures.length > 0 ? mvpFeatures : ["Feature principal"],
    expectedMetrics,
  };
}
