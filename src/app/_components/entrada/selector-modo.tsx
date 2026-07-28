"use client";

import { useCallback } from "react";
import styles from "./selector-modo.module.css";

export interface SelectorModoProps {
  modo: "rapido" | "experto";
  generando: boolean;
  onChange: (modo: "rapido" | "experto") => void;
}

/**
 * Selector_Modo — role="radiogroup" con dos opciones (Modo Rápido / Modo Experto).
 * Una única parada de tabulación. Activación con Enter y Space.
 * Deshabilitado con aria-disabled="true" cuando `generando` es true.
 */
export function SelectorModo({ modo, generando, onChange }: SelectorModoProps) {
  const handleKeyDown = useCallback(
    (destino: "rapido" | "experto") => (e: React.KeyboardEvent) => {
      if (generando) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onChange(destino);
      }
    },
    [generando, onChange]
  );

  const handleClick = useCallback(
    (destino: "rapido" | "experto") => () => {
      if (generando) return;
      onChange(destino);
    },
    [generando, onChange]
  );

  return (
    <div
      role="radiogroup"
      aria-label="Modo de entrada"
      className={styles.radiogroup}
    >
      <div
        role="radio"
        aria-checked={modo === "rapido"}
        aria-disabled={generando}
        tabIndex={modo === "rapido" ? 0 : -1}
        className={`${styles.option} ${modo === "rapido" ? styles.optionSelected : ""} ${generando ? styles.optionDisabled : ""}`}
        onClick={handleClick("rapido")}
        onKeyDown={handleKeyDown("rapido")}
      >
        <span className={styles.label}>Modo Rápido</span>
        <span className={styles.sublabel}>Solo escribe tu idea</span>
      </div>

      <div
        role="radio"
        aria-checked={modo === "experto"}
        aria-disabled={generando}
        tabIndex={modo === "experto" ? 0 : -1}
        className={`${styles.option} ${modo === "experto" ? styles.optionSelected : ""} ${generando ? styles.optionDisabled : ""}`}
        onClick={handleClick("experto")}
        onKeyDown={handleKeyDown("experto")}
      >
        <span className={styles.label}>Modo Experto</span>
        <span className={styles.sublabel}>Brief completo</span>
      </div>
    </div>
  );
}
