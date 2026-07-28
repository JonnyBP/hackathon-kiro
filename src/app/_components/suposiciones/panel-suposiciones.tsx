"use client";

import { useState, useCallback } from "react";
import type { Suposicion } from "@/domain/view-model";
import {
  editarSuposicion,
  restaurarSuposicion,
} from "@/application/view/assumptions-model";
import { FilaSuposicion } from "./fila-suposicion";
import styles from "./panel-suposiciones.module.css";

export interface PanelSuposicionesProps {
  suposiciones: Suposicion[];
  onConfirmar: (suposiciones: Suposicion[]) => void;
}

/**
 * Panel_Suposiciones — Tabla de suposiciones inferidas.
 * No se muestra en Modo Experto ni cuando no hay suposiciones.
 * Edición en línea con foco automático. Confirmación deshabilitada
 * mientras una fila está en edición.
 */
export function PanelSuposiciones({ suposiciones, onConfirmar }: PanelSuposicionesProps) {
  const [filas, setFilas] = useState<Suposicion[]>(suposiciones);
  const [claveEnEdicion, setClaveEnEdicion] = useState<string | null>(null);

  const hayEdicionActiva = claveEnEdicion !== null;

  const handleIniciarEdicion = useCallback((clave: string) => {
    setClaveEnEdicion(clave);
  }, []);

  const handleConfirmarEdicion = useCallback(
    (clave: string, valor: string): string | null => {
      const resultado = editarSuposicion(filas, clave, valor);
      if (resultado.error) {
        return resultado.error;
      }
      setFilas(resultado.suposiciones);
      setClaveEnEdicion(null);
      return null;
    },
    [filas]
  );

  const handleCancelarEdicion = useCallback(() => {
    setClaveEnEdicion(null);
  }, []);

  const handleRestaurar = useCallback(
    (clave: string) => {
      const restauradas = restaurarSuposicion(filas, clave);
      setFilas(restauradas);
    },
    [filas]
  );

  const handleConfirmarPanel = useCallback(() => {
    onConfirmar(filas);
  }, [filas, onConfirmar]);

  if (suposiciones.length === 0) return null;

  return (
    <section className={styles.panel} aria-labelledby="suposiciones-heading">
      <h2 id="suposiciones-heading" className={styles.heading}>
        Suposiciones del sistema
      </h2>
      <p className={styles.description}>
        El sistema infirió estos datos sobre tu producto. Puedes cambiar cualquiera antes de continuar.
      </p>

      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Suposición</th>
            <th scope="col">Valor</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((sup) => (
            <FilaSuposicion
              key={sup.clave}
              suposicion={sup}
              enEdicion={claveEnEdicion === sup.clave}
              onIniciarEdicion={handleIniciarEdicion}
              onConfirmarEdicion={handleConfirmarEdicion}
              onCancelarEdicion={handleCancelarEdicion}
              onRestaurar={handleRestaurar}
            />
          ))}
        </tbody>
      </table>

      <button
        type="button"
        className={styles.confirmButton}
        disabled={hayEdicionActiva}
        onClick={handleConfirmarPanel}
        aria-disabled={hayEdicionActiva}
      >
        Confirmar y generar
      </button>
    </section>
  );
}
