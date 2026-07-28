// src/application/view/selectors/mermaid-view.ts — Mermaid diagram analysis (pure TS, no React)

export interface MermaidViewAusente {
  tipo: "ausente";
  textoAlternativo: string;
}

export interface MermaidViewCandidato {
  tipo: "candidato";
  nodos: number;
  textoAlternativo: string;
}

export interface MermaidViewDemasiadosNodos {
  tipo: "demasiados_nodos";
  nodos: number;
  textoAlternativo: string;
}

export type MermaidViewResult = MermaidViewAusente | MermaidViewCandidato | MermaidViewDemasiadosNodos;

const MAX_NODES = 40;
const MAX_SERVICES_ALT = 40;
const MAX_CONNECTIONS_ALT = 80;

/**
 * Counts nodes in Mermaid text by matching typical node declarations.
 * Matches patterns like: A, A[label], A(label), A{label}, A((label)), etc.
 * at the start of lines or as connection endpoints.
 */
function countNodes(text: string): number {
  const nodeIds = new Set<string>();

  // Match node declarations: lines starting with an identifier optionally followed by brackets
  // Also match endpoints in connections (A --> B)
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip directives, comments, and keywords
    if (
      trimmed.startsWith("%%") ||
      trimmed.startsWith("graph") ||
      trimmed.startsWith("flowchart") ||
      trimmed.startsWith("sequenceDiagram") ||
      trimmed.startsWith("classDiagram") ||
      trimmed.startsWith("stateDiagram") ||
      trimmed.startsWith("erDiagram") ||
      trimmed.startsWith("gantt") ||
      trimmed.startsWith("pie") ||
      trimmed.startsWith("subgraph") ||
      trimmed.startsWith("end") ||
      trimmed.startsWith("direction") ||
      trimmed === ""
    ) {
      continue;
    }

    // Match connection patterns: A --> B, A --- B, A ==> B, A -.-> B, etc.
    const connectionRegex = /([A-Za-z_][\w]*)/g;
    let match: RegExpExecArray | null;
    while ((match = connectionRegex.exec(trimmed)) !== null) {
      const id = match[1]!;
      // Filter out Mermaid keywords
      if (!isMermaidKeyword(id)) {
        nodeIds.add(id);
      }
    }
  }

  return nodeIds.size;
}

function isMermaidKeyword(word: string): boolean {
  const keywords = new Set([
    "graph", "flowchart", "subgraph", "end", "direction",
    "TB", "TD", "BT", "RL", "LR",
    "classDef", "class", "click", "style", "linkStyle",
    "sequenceDiagram", "classDiagram", "stateDiagram",
    "erDiagram", "gantt", "pie",
  ]);
  return keywords.has(word);
}

/**
 * Builds alternative text listing services and connections.
 */
function buildTextoAlternativo(text: string): string {
  const services = new Set<string>();
  const connections: string[] = [];

  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Match connection patterns: A --> B, A --- B, A ==> B, A -.-> B, A -->|label| B
    // General pattern: IDENTIFIER <arrow> IDENTIFIER
    const connRegex = /([A-Za-z_][\w]*)\s*(?:-->|==>|---|-.->|---->|===|~~~|--\s*>|-->?\|[^|]*\|)\s*([A-Za-z_][\w]*)/g;
    let match: RegExpExecArray | null;
    while ((match = connRegex.exec(trimmed)) !== null) {
      const source = match[1]!;
      const target = match[2]!;
      if (!isMermaidKeyword(source)) services.add(source);
      if (!isMermaidKeyword(target)) services.add(target);
      if (connections.length < MAX_CONNECTIONS_ALT) {
        connections.push(`${source} → ${target}`);
      }
    }
  }

  const serviceList = [...services].slice(0, MAX_SERVICES_ALT);
  const parts: string[] = [];

  if (serviceList.length > 0) {
    parts.push(`Servicios: ${serviceList.join(", ")}`);
  }
  if (connections.length > 0) {
    parts.push(`Conexiones: ${connections.join("; ")}`);
  }

  return parts.join(". ");
}

export function analizarDiagrama(mermaidText: string | null | undefined): MermaidViewResult {
  // Absent case
  if (mermaidText == null || mermaidText.trim() === "") {
    return { tipo: "ausente", textoAlternativo: "" };
  }

  const nodos = countNodes(mermaidText);
  const textoAlternativo = buildTextoAlternativo(mermaidText);

  if (nodos > MAX_NODES) {
    return { tipo: "demasiados_nodos", nodos, textoAlternativo };
  }

  return { tipo: "candidato", nodos, textoAlternativo };
}
