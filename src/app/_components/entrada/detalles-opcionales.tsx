"use client";

import { useState, useCallback, useEffect, useId } from "react";
import type { EntradaFormulario } from "@/domain/view-model";
import { ContadorCaracteres } from "./contador-caracteres";
import { SelectorRegion } from "./selector-region";
import styles from "./detalles-opcionales.module.css";

export interface DetallesOpcionalesProps {
  entrada: EntradaFormulario;
  onEntradaChange: (entrada: EntradaFormulario) => void;
  onChange: (campo: keyof EntradaFormulario, valor: string) => void;
  /** Whether session restored values exist */
  tieneValoresRestaurados?: boolean;
}

const MAX_TECNOLOGIA = 300;
const MAX_NO_QUIERE = 300;

/**
 * DetallesOpcionales — Sección colapsable con aria-expanded y aria-controls.
 * Contiene: Tecnología preferida, Selector_Región, Algo que NO quieres.
 * Muestra conteo de campos con valor en el label.
 * Auto-expande cuando hay valores restaurados desde sesión.
 */
export function DetallesOpcionales({
  entrada,
  onEntradaChange,
  onChange,
  tieneValoresRestaurados = false,
}: DetallesOpcionalesProps) {
  const contentId = useId();
  const [expandido, setExpandido] = useState(false);

  // Auto-expand if restored values exist
  useEffect(() => {
    if (tieneValoresRestaurados) {
      setExpandido(true);
    }
  }, [tieneValoresRestaurados]);

  // Count fields with values
  const camposConValor = [
    entrada.tecnologiaPreferida,
    entrada.noQuiere,
    ...(entrada.regionesSeleccionadas.length > 0 ? ["filled"] : []),
  ].filter((v) => v && v.trim().length > 0).length;

  const handleToggle = useCallback(() => {
    setExpandido((prev) => !prev);
  }, []);

  const handleFieldChange = useCallback(
    (campo: keyof EntradaFormulario, max: number) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        let valor = e.target.value;
        if ([...valor].length > max) {
          valor = [...valor].slice(0, max).join("");
        }
        onChange(campo, valor);
      },
    [onChange]
  );

  const accessibleLabel = camposConValor > 0
    ? `Detalles opcionales (${camposConValor} ${camposConValor === 1 ? "campo completado" : "campos completados"})`
    : "Detalles opcionales";

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={expandido}
        aria-controls={contentId}
        aria-label={accessibleLabel}
        onClick={handleToggle}
      >
        <span
          className={`${styles.triggerIcon} ${expandido ? styles.triggerIconExpanded : ""}`}
          aria-hidden="true"
        >
          ▶
        </span>
        Detalles opcionales
        {camposConValor > 0 && (
          <span className={styles.badge}>
            {camposConValor} {camposConValor === 1 ? "campo" : "campos"}
          </span>
        )}
      </button>

      {expandido && (
        <div id={contentId} className={styles.content}>
          <div className={styles.fieldGroup}>
            <label
              htmlFor="campo-tecnologia-opt"
              className={`${styles.fieldLabel} ${styles.fieldLabelOptional}`}
            >
              ¿Tecnología preferida?
            </label>
            <input
              id="campo-tecnologia-opt"
              type="text"
              className={styles.input}
              value={entrada.tecnologiaPreferida}
              onChange={handleFieldChange("tecnologiaPreferida", MAX_TECNOLOGIA)}
              placeholder="Frameworks, lenguajes, servicios..."
            />
            <ContadorCaracteres texto={entrada.tecnologiaPreferida} max={MAX_TECNOLOGIA} />
          </div>

          <SelectorRegion entrada={entrada} onEntradaChange={onEntradaChange} />

          <div className={styles.fieldGroup}>
            <label
              htmlFor="campo-noquiere-opt"
              className={`${styles.fieldLabel} ${styles.fieldLabelOptional}`}
            >
              ¿Algo que NO quieres?
            </label>
            <input
              id="campo-noquiere-opt"
              type="text"
              className={styles.input}
              value={entrada.noQuiere}
              onChange={handleFieldChange("noQuiere", MAX_NO_QUIERE)}
              placeholder="Restricciones o exclusiones"
            />
            <ContadorCaracteres texto={entrada.noQuiere} max={MAX_NO_QUIERE} />
          </div>
        </div>
      )}
    </div>
  );
}
