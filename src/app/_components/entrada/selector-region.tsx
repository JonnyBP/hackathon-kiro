"use client";

import { useCallback } from "react";
import type { EntradaFormulario } from "@/domain/view-model";
import {
  REGIONES_RAPIDO,
  REGIONES_EXPERTO,
  deseleccionarRegion,
  seleccionarGlobal,
  seleccionarEspecifica,
} from "@/application/view/input-model";
import styles from "./selector-region.module.css";

export interface SelectorRegionProps {
  entrada: EntradaFormulario;
  onEntradaChange: (entrada: EntradaFormulario) => void;
}

/**
 * Selector_Región — Selección simple en Modo Rápido (5 opciones),
 * múltiple en Modo Experto (6 opciones).
 * Global es mutuamente exclusiva con las específicas.
 * Chips en orden canónico con botón "×" de quitar.
 */
export function SelectorRegion({ entrada, onEntradaChange }: SelectorRegionProps) {
  const regiones = entrada.modo === "experto" ? REGIONES_EXPERTO : REGIONES_RAPIDO;
  const esMultiple = entrada.modo === "experto";
  const seleccionadas = entrada.regionesSeleccionadas;

  const handleToggle = useCallback(
    (region: string) => {
      const estaSeleccionada = seleccionadas.includes(region);

      if (esMultiple) {
        // Modo experto: multi-select
        if (estaSeleccionada) {
          onEntradaChange(deseleccionarRegion(entrada, region));
        } else {
          if (region === "Global") {
            onEntradaChange(seleccionarGlobal(entrada));
          } else {
            onEntradaChange(seleccionarEspecifica(entrada, region));
          }
        }
      } else {
        // Modo rápido: single select (toggle)
        if (estaSeleccionada) {
          onEntradaChange(deseleccionarRegion(entrada, region));
        } else {
          // En rápido, solo una a la vez
          onEntradaChange({ ...entrada, regionesSeleccionadas: [region] });
        }
      }
    },
    [entrada, esMultiple, seleccionadas, onEntradaChange]
  );

  const handleRemoveChip = useCallback(
    (region: string) => {
      onEntradaChange(deseleccionarRegion(entrada, region));
    },
    [entrada, onEntradaChange]
  );

  const handleKeyDown = useCallback(
    (region: string) => (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle(region);
      }
    },
    [handleToggle]
  );

  return (
    <div className={styles.container}>
      <span className={styles.label} id="region-label">
        ¿Desde dónde se conectarán más tus usuarios?
      </span>

      <div
        role={esMultiple ? "group" : "radiogroup"}
        aria-labelledby="region-label"
        aria-multiselectable={esMultiple ? "true" : undefined}
        className={styles.options}
      >
        {regiones.map((region) => {
          const selected = seleccionadas.includes(region);
          return (
            <div
              key={region}
              role={esMultiple ? "checkbox" : "radio"}
              aria-checked={selected}
              aria-label={region}
              tabIndex={0}
              className={`${styles.option} ${selected ? styles.optionSelected : ""}`}
              onClick={() => handleToggle(region)}
              onKeyDown={handleKeyDown(region)}
            >
              {region}
            </div>
          );
        })}
      </div>

      {seleccionadas.length > 0 && (
        <div className={styles.chips} aria-label="Regiones seleccionadas">
          {seleccionadas.map((region) => (
            <span key={region} className={styles.chip}>
              {region}
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => handleRemoveChip(region)}
                aria-label={`Quitar ${region}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {entrada.modo === "experto" && (
        <p className={styles.note}>
          Esto determina la región AWS recomendada y las regulaciones de privacidad aplicables
        </p>
      )}
    </div>
  );
}
