"use client";

import { useState, useCallback, useRef, useEffect, useId } from "react";
import type { Suposicion } from "@/domain/view-model";
import styles from "./panel-suposiciones.module.css";

export interface FilaSuposicionProps {
  suposicion: Suposicion;
  enEdicion: boolean;
  onIniciarEdicion: (clave: string) => void;
  onConfirmarEdicion: (clave: string, valor: string) => string | null;
  onCancelarEdicion: () => void;
  onRestaurar: (clave: string) => void;
}

/**
 * FilaSuposicion — Una fila del Panel_Suposiciones.
 * Modo lectura: etiqueta, valor, botón "Cambiar", botón "Restaurar".
 * Modo edición: input inline con foco automático, Enter confirma, Escape cancela.
 */
export function FilaSuposicion({
  suposicion,
  enEdicion,
  onIniciarEdicion,
  onConfirmarEdicion,
  onCancelarEdicion,
  onRestaurar,
}: FilaSuposicionProps) {
  const [valorTemp, setValorTemp] = useState(suposicion.valorActual);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cambiarRef = useRef<HTMLButtonElement>(null);
  const errorId = useId();

  // Focus the input when entering edit mode
  useEffect(() => {
    if (enEdicion && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [enEdicion]);

  // Reset temp value when entering edit mode
  useEffect(() => {
    if (enEdicion) {
      setValorTemp(suposicion.valorActual);
      setError(null);
    }
  }, [enEdicion, suposicion.valorActual]);

  const handleConfirm = useCallback(() => {
    const resultado = onConfirmarEdicion(suposicion.clave, valorTemp);
    if (resultado) {
      setError(resultado);
    } else {
      setError(null);
      // Return focus to "Cambiar" button
      setTimeout(() => cambiarRef.current?.focus(), 0);
    }
  }, [suposicion.clave, valorTemp, onConfirmarEdicion]);

  const handleCancel = useCallback(() => {
    setError(null);
    onCancelarEdicion();
    // Return focus to "Cambiar" button
    setTimeout(() => cambiarRef.current?.focus(), 0);
  }, [onCancelarEdicion]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleConfirm, handleCancel]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let valor = e.target.value;
      // Limit to 120 characters
      if ([...valor].length > 120) {
        valor = [...valor].slice(0, 120).join("");
      }
      setValorTemp(valor);
      // Clear error on change
      if (error) setError(null);
    },
    [error]
  );

  return (
    <tr className={suposicion.modificada ? styles.filaModificada : undefined}>
      <td className={styles.clave}>{suposicion.clave}</td>
      <td className={styles.valor}>
        {enEdicion ? (
          <div>
            <input
              ref={inputRef}
              type="text"
              className={`${styles.editInput} ${error ? styles.editInputInvalid : ""}`}
              value={valorTemp}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? errorId : undefined}
              aria-label={`Editar ${suposicion.clave}`}
              maxLength={120}
            />
            {error && (
              <div id={errorId} className={styles.editError} role="alert">
                {error}
              </div>
            )}
          </div>
        ) : (
          suposicion.valorActual
        )}
      </td>
      <td className={styles.acciones}>
        {!enEdicion && (
          <>
            <button
              ref={cambiarRef}
              type="button"
              className={styles.actionButton}
              onClick={() => onIniciarEdicion(suposicion.clave)}
              aria-label={`Cambiar ${suposicion.clave}`}
            >
              Cambiar
            </button>
            {suposicion.modificada && (
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => onRestaurar(suposicion.clave)}
                aria-label={`Restaurar ${suposicion.clave}`}
              >
                Restaurar
              </button>
            )}
          </>
        )}
        {enEdicion && (
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleConfirm}
            aria-label={`Confirmar edición de ${suposicion.clave}`}
          >
            ✓
          </button>
        )}
      </td>
    </tr>
  );
}
