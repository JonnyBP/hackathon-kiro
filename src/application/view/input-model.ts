/**
 * input-model.ts — Lógica pura de la Pantalla de Entrada (sin React).
 * Decisión D9: todo lo probable vive en application/view/.
 */

import type { EntradaFormulario } from "@/domain/view-model";

// ─── Regiones ────────────────────────────────────────────────────────────────

/** Orden canónico de regiones para Modo Rápido (5 opciones). */
export const REGIONES_RAPIDO: readonly string[] = [
  "México",
  "LATAM",
  "USA/Canadá",
  "Europa",
  "Global",
] as const;

/** Orden canónico de regiones para Modo Experto (6 opciones). */
export const REGIONES_EXPERTO: readonly string[] = [
  "México",
  "LATAM",
  "USA",
  "Europa",
  "Asia",
  "Global",
] as const;

// ─── Longitud útil ───────────────────────────────────────────────────────────

/**
 * Calcula la longitud útil de un texto: cantidad de puntos de código Unicode
 * después de eliminar espacios en blanco iniciales y finales.
 * Cada emoji, acento o carácter compuesto cuenta como su cantidad de puntos de código.
 */
export function calcularLongitudUtil(text: string): number {
  return [...text.trim()].length;
}

// ─── Validación de la Idea ───────────────────────────────────────────────────

export interface ResultadoValidacion {
  valida: boolean;
  mensaje: string | null;
}

/**
 * Valida el texto de la Idea según las reglas de longitud útil.
 * - Vacío → "Escribe tu idea para continuar"
 * - <20 → "Describe tu idea con un poco más de detalle (mínimo 20 caracteres)"
 * - ≥20 y ≤2000 → válida
 */
export function validarIdea(text: string): ResultadoValidacion {
  const longitud = calcularLongitudUtil(text);
  if (longitud === 0) {
    return { valida: false, mensaje: "Escribe tu idea para continuar" };
  }
  if (longitud < 20) {
    return {
      valida: false,
      mensaje: "Describe tu idea con un poco más de detalle (mínimo 20 caracteres)",
    };
  }
  return { valida: true, mensaje: null };
}

// ─── Truncado de la Idea ─────────────────────────────────────────────────────

/**
 * Conserva los primeros `maxCodePoints` puntos de código del texto.
 * Usado para cortar el contenido al pegar.
 */
export function truncarIdea(text: string, maxCodePoints: number): string {
  const codePoints = [...text];
  if (codePoints.length <= maxCodePoints) return text;
  return codePoints.slice(0, maxCodePoints).join("");
}

// ─── Alternar Modo ───────────────────────────────────────────────────────────

/**
 * Alterna entre modos preservando la Idea y los campos comunes.
 * - Al pasar a "rapido" con 2+ regiones, conserva solo la primera.
 * - Los campos exclusivos de experto se retienen en `regionesRetenidas`.
 */
export function alternarModo(
  entrada: EntradaFormulario,
  destino: "rapido" | "experto"
): EntradaFormulario {
  if (entrada.modo === destino) return entrada;

  if (destino === "rapido") {
    // Pasando de experto a rápido
    const regionesActuales = entrada.regionesSeleccionadas;
    const primeraRegion = regionesActuales.length > 0 ? regionesActuales[0] : undefined;

    // Retener las regiones que no se conservan
    const regionesRetenidas = regionesActuales.length > 1
      ? regionesActuales.slice(1)
      : [];

    // Solo mantener la primera si está en las opciones de rápido
    const regionesEnRapido = primeraRegion && REGIONES_RAPIDO.includes(primeraRegion)
      ? [primeraRegion]
      : [];

    return {
      ...entrada,
      modo: "rapido",
      regionesSeleccionadas: regionesEnRapido,
      regionesRetenidas,
    };
  }

  // Pasando de rápido a experto: restaurar regiones retenidas
  const restauradas = entrada.regionesRetenidas.filter((r) =>
    REGIONES_EXPERTO.includes(r)
  );

  // Unir las seleccionadas actuales con las restauradas, en orden canónico
  const todas = [...entrada.regionesSeleccionadas, ...restauradas];
  const unicas = [...new Set(todas)];
  const enOrden = REGIONES_EXPERTO.filter((r) => unicas.includes(r));

  return {
    ...entrada,
    modo: "experto",
    regionesSeleccionadas: enOrden,
    regionesRetenidas: [],
  };
}

// ─── Helpers de Región ───────────────────────────────────────────────────────

/**
 * Selecciona una región específica (no Global).
 * - Si Global estaba seleccionada, la retira.
 * - Máximo 5 regiones específicas.
 * - Mantiene orden canónico.
 */
export function seleccionarRegion(
  entrada: EntradaFormulario,
  region: string
): EntradaFormulario {
  if (region === "Global") return seleccionarGlobal(entrada);

  const sinGlobal = entrada.regionesSeleccionadas.filter((r) => r !== "Global");
  if (sinGlobal.includes(region)) return entrada;
  if (sinGlobal.length >= 5) return entrada;

  const nuevas = [...sinGlobal, region];
  const ordenCanon = entrada.modo === "experto" ? REGIONES_EXPERTO : REGIONES_RAPIDO;
  const enOrden = ordenCanon.filter((r) => nuevas.includes(r));

  return { ...entrada, regionesSeleccionadas: enOrden };
}

/**
 * Deselecciona una región.
 */
export function deseleccionarRegion(
  entrada: EntradaFormulario,
  region: string
): EntradaFormulario {
  const nuevas = entrada.regionesSeleccionadas.filter((r) => r !== region);
  return { ...entrada, regionesSeleccionadas: nuevas };
}

/**
 * Selecciona Global (retira todas las específicas).
 */
export function seleccionarGlobal(entrada: EntradaFormulario): EntradaFormulario {
  return { ...entrada, regionesSeleccionadas: ["Global"] };
}

/**
 * Selecciona una región específica (retira Global si estaba).
 * Alias semántico de seleccionarRegion para regiones no-Global.
 */
export function seleccionarEspecifica(
  entrada: EntradaFormulario,
  region: string
): EntradaFormulario {
  if (region === "Global") return entrada;
  return seleccionarRegion(entrada, region);
}
