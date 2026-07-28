"use client";

import { useCallback, useRef, useEffect } from "react";
import type { EntradaFormulario } from "@/domain/view-model";
import {
  validarIdea,
  truncarIdea,
} from "@/application/view/input-model";
import { ContadorCaracteres } from "./contador-caracteres";
import styles from "./formulario-entrada.module.css";

export interface FormularioEntradaProps {
  entrada: EntradaFormulario;
  generando: boolean;
  errorIdea: string | null;
  onChange: (campo: keyof EntradaFormulario, valor: string) => void;
  onSubmit: () => void;
  onBlurIdea: () => void;
  onErrorIdea: (error: string | null) => void;
}

const MAX_IDEA = 2000;
const LINE_HEIGHT_PX = 24; // approx 1 line at 16px * 1.5
const MIN_LINES = 4;
const MAX_LINES = 12;

/** Campos expertos con sus limits */
const CAMPOS_EXPERTO: {
  campo: keyof EntradaFormulario;
  label: string;
  max: number;
  placeholder: string;
}[] = [
  { campo: "nombreProyecto", label: "Nombre del proyecto", max: 100, placeholder: "Nombre de tu proyecto" },
  { campo: "publicoObjetivo", label: "¿Quién es tu público objetivo?", max: 300, placeholder: "Describe a quién va dirigido" },
  { campo: "tecnologiaPreferida", label: "¿Tecnología preferida?", max: 300, placeholder: "Frameworks, lenguajes, servicios..." },
  { campo: "noQuiere", label: "¿Algo que NO quieres?", max: 500, placeholder: "Restricciones o exclusiones" },
  { campo: "presupuesto", label: "Presupuesto aproximado", max: 60, placeholder: "$1,000 - $10,000 USD" },
];

/**
 * Formulario_Entrada — Captura la Idea y campos complementarios.
 * En Modo Rápido solo muestra la Idea.
 * En Modo Experto muestra los 7 campos (Idea + 5 de texto + región, que se monta externamente).
 */
export function FormularioEntrada({
  entrada,
  generando,
  errorIdea,
  onChange,
  onSubmit,
  onBlurIdea,
  onErrorIdea,
}: FormularioEntradaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const minHeight = MIN_LINES * LINE_HEIGHT_PX;
    const maxHeight = MAX_LINES * LINE_HEIGHT_PX;
    const scrollH = el.scrollHeight;
    if (scrollH <= maxHeight) {
      el.style.height = `${Math.max(minHeight, scrollH)}px`;
      el.style.overflowY = "hidden";
    } else {
      el.style.height = `${maxHeight}px`;
      el.style.overflowY = "auto";
    }
  }, [entrada.idea]);

  const handleIdeaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      let valor = e.target.value;
      // Truncar si excede 2000 code points
      if ([...valor].length > MAX_IDEA) {
        valor = truncarIdea(valor, MAX_IDEA);
      }
      onChange("idea", valor);
      // Reevaluar error en cada cambio
      if (errorIdea) {
        const resultado = validarIdea(valor);
        if (resultado.valida) {
          onErrorIdea(null);
        }
      }
    },
    [onChange, errorIdea, onErrorIdea]
  );

  const handleIdeaPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pastedText = e.clipboardData.getData("text");
      const currentText = entrada.idea;
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Build the resulting text
      const before = currentText.slice(0, start);
      const after = currentText.slice(end);
      const combined = before + pastedText + after;

      if ([...combined].length > MAX_IDEA) {
        e.preventDefault();
        const truncated = truncarIdea(combined, MAX_IDEA);
        onChange("idea", truncated);
      }
    },
    [entrada.idea, onChange]
  );

  const handleFieldChange = useCallback(
    (campo: keyof EntradaFormulario, max: number) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        let valor = e.target.value;
        if ([...valor].length > max) {
          valor = [...valor].slice(0, max).join("");
        }
        onChange(campo, valor);
      },
    [onChange]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (generando) return;

      const resultado = validarIdea(entrada.idea);
      if (!resultado.valida) {
        onErrorIdea(resultado.mensaje);
        textareaRef.current?.focus();
        return;
      }
      onErrorIdea(null);
      onSubmit();
    },
    [generando, entrada.idea, onSubmit, onErrorIdea]
  );

  const ideaId = "campo-idea";
  const errorIdeaId = "error-idea";
  const isOverflowing = [...entrada.idea].length >= MAX_IDEA;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.heading}>¿Cuál es tu idea?</h2>

      <div className={styles.fieldGroup}>
        <textarea
          ref={textareaRef}
          id={ideaId}
          className={`${styles.textarea} ${errorIdea ? styles.textareaInvalid : ""} ${isOverflowing ? styles.textareaScrollable : ""}`}
          value={entrada.idea}
          onChange={handleIdeaChange}
          onPaste={handleIdeaPaste}
          onBlur={onBlurIdea}
          placeholder="Escribe tu idea en una o dos oraciones..."
          aria-invalid={errorIdea ? "true" : undefined}
          aria-describedby={errorIdea ? errorIdeaId : undefined}
          style={{ minHeight: `${MIN_LINES * LINE_HEIGHT_PX}px` }}
        />
        <ContadorCaracteres texto={entrada.idea} max={MAX_IDEA} usarLongitudUtil />
        {errorIdea && (
          <div id={errorIdeaId} className={styles.error} role="alert">
            {errorIdea}
          </div>
        )}
      </div>

      {entrada.modo === "experto" &&
        CAMPOS_EXPERTO.map(({ campo, label, max, placeholder }) => (
          <div key={campo} className={styles.fieldGroup}>
            <label htmlFor={`campo-${campo}`} className={`${styles.fieldLabel} ${styles.fieldLabelOptional}`}>
              {label}
            </label>
            <input
              id={`campo-${campo}`}
              type="text"
              className={styles.input}
              value={entrada[campo] as string}
              onChange={handleFieldChange(campo, max)}
              placeholder={placeholder}
              maxLength={max * 2} /* Allow for multi-byte, real limit in handler */
            />
            <ContadorCaracteres texto={entrada[campo] as string} max={max} />
          </div>
        ))}

      <button
        type="submit"
        className={styles.submitButton}
        disabled={generando}
      >
        {generando ? "Generando..." : "Generar especificación"}
      </button>
    </form>
  );
}
