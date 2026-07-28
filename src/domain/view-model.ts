import type { Agent1Output } from "@/domain/types";

export type IdSeccion = "mercado" | "tecnico" | "costos" | "compliance" | "tareas" | "devsecops";

export type FuenteSeccion = "agente1" | "agente2" | "agente3" | "agente4";

export type MotivoNoDisponible = "fallo_del_agente" | "esquema_invalido" | "error_de_red" | "tiempo_limite";

export type EstadoSeccion<T> =
  | { readonly estado: "pendiente" }
  | { readonly estado: "disponible"; readonly datos: T }
  | { readonly estado: "no_disponible"; readonly motivo: MotivoNoDisponible };

export type EstadoGeneracion = "inactivo" | "en_curso" | "completado" | "fallido" | "cancelado";

// Vista types per section — these will be filled in by later tasks;
// for now use `unknown` as placeholder so other files can reference them.
export type VistaMercado = unknown;
export type VistaTecnico = unknown;
export type VistaCostos = unknown;
export type VistaCompliance = unknown;
export type VistaTareas = unknown;
export type VistaDevSecOps = unknown;

export interface Reporte {
  readonly brief: Agent1Output;
  readonly mercado: EstadoSeccion<VistaMercado>;
  readonly tecnico: EstadoSeccion<VistaTecnico>;
  readonly costos: EstadoSeccion<VistaCostos>;
  readonly compliance: EstadoSeccion<VistaCompliance>;
  readonly tareas: EstadoSeccion<VistaTareas>;
  readonly devsecops: EstadoSeccion<VistaDevSecOps>;
}

export interface Suposicion {
  readonly clave: string;
  readonly valorInferido: string;
  readonly valorActual: string;
  readonly modificada: boolean;
}

export interface EntradaFormulario {
  readonly modo: "rapido" | "experto";
  readonly idea: string;
  readonly nombreProyecto: string;
  readonly publicoObjetivo: string;
  readonly tecnologiaPreferida: string;
  readonly noQuiere: string;
  readonly presupuesto: string;
  readonly regionesSeleccionadas: readonly string[];
  readonly regionesRetenidas: readonly string[]; // retained from expert mode
}

export interface EstadoUI {
  readonly versionEsquema: 1;
  readonly pantalla: "entrada" | "suposiciones" | "generacion" | "salida";
  readonly estadoGeneracion: EstadoGeneracion;
  readonly entrada: EntradaFormulario;
  readonly suposiciones: readonly Suposicion[];
  readonly reporte: Reporte;
  readonly pestanaActiva: IdSeccion;
  readonly intentos: Readonly<Record<FuenteSeccion, number>>;
  readonly mascotaOculta: boolean;
}

/** Canonical section order */
export const SECCIONES: readonly IdSeccion[] = ["mercado", "tecnico", "costos", "compliance", "tareas", "devsecops"] as const;

/** Maps each source to its sections */
export const FUENTE_A_SECCIONES: Readonly<Record<FuenteSeccion, readonly IdSeccion[]>> = {
  agente1: ["mercado"],
  agente2: ["tecnico", "costos", "tareas"],
  agente3: ["compliance"],
  agente4: ["devsecops"],
} as const;

/** Reverse: which source produces a given section */
export const SECCION_A_FUENTE: Readonly<Record<IdSeccion, FuenteSeccion>> = {
  mercado: "agente1",
  tecnico: "agente2",
  costos: "agente2",
  tareas: "agente2",
  compliance: "agente3",
  devsecops: "agente4",
} as const;
