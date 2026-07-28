"use client";

import { calcularLongitudUtil } from "@/application/view/input-model";
import styles from "./contador-caracteres.module.css";

export interface ContadorCaracteresProps {
  texto: string;
  max: number;
  /** If true, counts trimmed code points (for Idea). Otherwise raw code points. */
  usarLongitudUtil?: boolean;
}

/**
 * ContadorCaracteres — Muestra caracteres restantes de forma permanente.
 * Valor inicial = max para campo vacío, valor 0 cuando se alcanza el límite.
 */
export function ContadorCaracteres({ texto, max, usarLongitudUtil = false }: ContadorCaracteresProps) {
  const longitud = usarLongitudUtil
    ? calcularLongitudUtil(texto)
    : [...texto].length;
  const restantes = Math.max(0, max - longitud);
  const enLimite = restantes === 0;

  return (
    <span
      className={`${styles.counter} ${enLimite ? styles.counterWarning : ""}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {restantes}/{max}
    </span>
  );
}
