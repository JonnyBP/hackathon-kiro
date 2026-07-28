// src/application/view/selectors/truncate-text.ts — Text truncation utility (pure TS, no React)

export interface TruncateResult {
  visible: string;
  completo: string;
  truncado: boolean;
}

/**
 * Truncates text at `limit` characters. Marks with `…` only when truncated.
 */
export function truncarTexto(text: string, limit: number): TruncateResult {
  if (text.length <= limit) {
    return { visible: text, completo: text, truncado: false };
  }
  return {
    visible: text.slice(0, limit) + "…",
    completo: text,
    truncado: true,
  };
}
