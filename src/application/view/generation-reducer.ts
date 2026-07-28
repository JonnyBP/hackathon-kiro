// src/application/view/generation-reducer.ts — Pure reducer for generation state
import type {
  EstadoGeneracion,
  EstadoUI,
  FuenteSeccion,
  IdSeccion,
  MotivoNoDisponible,
  Reporte,
  EntradaFormulario,
  Suposicion,
  EstadoSeccion,
} from "@/domain/view-model";
import { FUENTE_A_SECCIONES, SECCIONES } from "@/domain/view-model";

// ─── Action Types ────────────────────────────────────────────────────────────

export type AccionGeneracion =
  | { readonly tipo: "INICIAR_GENERACION" }
  | { readonly tipo: "SECCION_DISPONIBLE"; readonly fuente: FuenteSeccion; readonly datos: Record<IdSeccion, unknown> }
  | { readonly tipo: "SECCION_FALLIDA"; readonly fuente: FuenteSeccion; readonly motivo: MotivoNoDisponible }
  | { readonly tipo: "CANCELAR" }
  | { readonly tipo: "REINTENTAR"; readonly fuente: FuenteSeccion }
  | { readonly tipo: "NUEVA_GENERACION" }
  | { readonly tipo: "CAMBIAR_PESTANA"; readonly pestana: IdSeccion }
  | { readonly tipo: "TOGGLE_MASCOTA" };

// ─── Derived state helper ────────────────────────────────────────────────────

/**
 * Derives the generation status from the report's section states.
 * @param reporte - the current report object
 * @param cancelada - whether the generation was cancelled
 * @param iniciada - whether the generation was started
 */
export function derivarEstadoGeneracion(
  reporte: Reporte,
  cancelada: boolean,
  iniciada: boolean,
): EstadoGeneracion {
  if (!iniciada) return "inactivo";
  if (cancelada) return "cancelado";

  const estados = SECCIONES.map((s) => reporte[s].estado);
  const tienePendiente = estados.some((e) => e === "pendiente");
  const tieneDisponible = estados.some((e) => e === "disponible");
  const todosNoDisponible = estados.every((e) => e === "no_disponible");

  if (tienePendiente) return "en_curso";
  if (todosNoDisponible) return "fallido";
  if (tieneDisponible) return "completado";

  // Fallback — shouldn't happen
  return "fallido";
}

// ─── Initial state factory ───────────────────────────────────────────────────

const ENTRADA_INICIAL: EntradaFormulario = {
  modo: "rapido",
  idea: "",
  nombreProyecto: "",
  publicoObjetivo: "",
  tecnologiaPreferida: "",
  noQuiere: "",
  presupuesto: "",
  regionesSeleccionadas: [],
  regionesRetenidas: [],
};

const BRIEF_INICIAL = {
  projectName: "",
  productVision: "",
  targetAudience: "",
  valueProposition: "",
  mvpFeatures: [] as string[],
  expectedMetrics: {
    mvpMonthlyUsers: 0,
    scaleMonthlyUsers: 0,
    peakConcurrentConnections: 0,
  },
};

function crearReporteInicial(): Reporte {
  return {
    brief: BRIEF_INICIAL,
    mercado: { estado: "pendiente" },
    tecnico: { estado: "pendiente" },
    costos: { estado: "pendiente" },
    compliance: { estado: "pendiente" },
    tareas: { estado: "pendiente" },
    devsecops: { estado: "pendiente" },
  };
}

const INTENTOS_INICIAL: Record<FuenteSeccion, number> = {
  agente1: 0,
  agente2: 0,
  agente3: 0,
  agente4: 0,
};

export function crearEstadoInicial(): EstadoUI {
  return {
    versionEsquema: 1,
    pantalla: "entrada",
    estadoGeneracion: "inactivo",
    entrada: ENTRADA_INICIAL,
    suposiciones: [],
    reporte: crearReporteInicial(),
    pestanaActiva: "mercado",
    intentos: { ...INTENTOS_INICIAL },
    mascotaOculta: false,
  };
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

export function generacionReducer(state: EstadoUI, action: AccionGeneracion): EstadoUI {
  switch (action.tipo) {
    case "INICIAR_GENERACION": {
      // Only valid from inactivo state
      if (state.estadoGeneracion !== "inactivo") return state;

      const reporte: Reporte = {
        ...state.reporte,
        mercado: { estado: "pendiente" },
        tecnico: { estado: "pendiente" },
        costos: { estado: "pendiente" },
        compliance: { estado: "pendiente" },
        tareas: { estado: "pendiente" },
        devsecops: { estado: "pendiente" },
      };

      return {
        ...state,
        reporte,
        estadoGeneracion: derivarEstadoGeneracion(reporte, false, true),
      };
    }

    case "SECCION_DISPONIBLE": {
      if (state.estadoGeneracion !== "en_curso") return state;

      const secciones = FUENTE_A_SECCIONES[action.fuente];
      let reporte = { ...state.reporte };

      for (const seccion of secciones) {
        const datos = action.datos[seccion];
        if (datos !== undefined) {
          reporte = {
            ...reporte,
            [seccion]: { estado: "disponible", datos } as EstadoSeccion<unknown>,
          };
        }
      }

      return {
        ...state,
        reporte,
        estadoGeneracion: derivarEstadoGeneracion(reporte, false, true),
      };
    }

    case "SECCION_FALLIDA": {
      if (state.estadoGeneracion !== "en_curso") return state;

      const secciones = FUENTE_A_SECCIONES[action.fuente];
      let reporte = { ...state.reporte };

      for (const seccion of secciones) {
        reporte = {
          ...reporte,
          [seccion]: { estado: "no_disponible", motivo: action.motivo } as EstadoSeccion<unknown>,
        };
      }

      return {
        ...state,
        reporte,
        estadoGeneracion: derivarEstadoGeneracion(reporte, false, true),
      };
    }

    case "CANCELAR": {
      if (state.estadoGeneracion !== "en_curso") return state;

      return {
        ...state,
        estadoGeneracion: "cancelado",
      };
    }

    case "REINTENTAR": {
      // Can retry from completado, fallido, or cancelado
      const allowed: EstadoGeneracion[] = ["completado", "fallido", "cancelado"];
      if (!allowed.includes(state.estadoGeneracion)) return state;

      const currentRetries = state.intentos[action.fuente];
      if (currentRetries >= 3) return state;

      const secciones = FUENTE_A_SECCIONES[action.fuente];
      let reporte = { ...state.reporte };

      for (const seccion of secciones) {
        reporte = {
          ...reporte,
          [seccion]: { estado: "pendiente" } as EstadoSeccion<unknown>,
        };
      }

      const intentos = {
        ...state.intentos,
        [action.fuente]: currentRetries + 1,
      };

      return {
        ...state,
        reporte,
        intentos,
        estadoGeneracion: derivarEstadoGeneracion(reporte, false, true),
      };
    }

    case "NUEVA_GENERACION": {
      return crearEstadoInicial();
    }

    case "CAMBIAR_PESTANA": {
      if (!SECCIONES.includes(action.pestana)) return state;
      return {
        ...state,
        pestanaActiva: action.pestana,
      };
    }

    case "TOGGLE_MASCOTA": {
      return {
        ...state,
        mascotaOculta: !state.mascotaOculta,
      };
    }

    default:
      return state;
  }
}
