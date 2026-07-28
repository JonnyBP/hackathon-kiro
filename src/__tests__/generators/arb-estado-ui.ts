// src/__tests__/generators/arb-estado-ui.ts — Generates full EstadoUI combining all generators
import fc from "fast-check";
import type {
  EstadoUI,
  EstadoGeneracion,
  IdSeccion,
  FuenteSeccion,
  EntradaFormulario,
  Suposicion,
} from "@/domain/view-model";
import { arbReporte } from "./arb-reporte";

const arbEstadoGeneracion: fc.Arbitrary<EstadoGeneracion> = fc.constantFrom(
  "inactivo",
  "en_curso",
  "completado",
  "fallido",
  "cancelado",
);

const arbPantalla = fc.constantFrom(
  "entrada" as const,
  "suposiciones" as const,
  "generacion" as const,
  "salida" as const,
);

const arbPestanaActiva: fc.Arbitrary<IdSeccion> = fc.constantFrom(
  "mercado",
  "tecnico",
  "costos",
  "compliance",
  "tareas",
  "devsecops",
);

const arbModo = fc.constantFrom("rapido" as const, "experto" as const);

const arbRegiones: fc.Arbitrary<readonly string[]> = fc.array(
  fc.constantFrom("us-east-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1", "global"),
  { minLength: 0, maxLength: 5 },
);

const arbEntradaFormulario: fc.Arbitrary<EntradaFormulario> = fc.record({
  modo: arbModo,
  idea: fc.string({ minLength: 0, maxLength: 2000 }),
  nombreProyecto: fc.string({ minLength: 0, maxLength: 128 }),
  publicoObjetivo: fc.string({ minLength: 0, maxLength: 200 }),
  tecnologiaPreferida: fc.string({ minLength: 0, maxLength: 200 }),
  noQuiere: fc.string({ minLength: 0, maxLength: 200 }),
  presupuesto: fc.string({ minLength: 0, maxLength: 50 }),
  regionesSeleccionadas: arbRegiones,
  regionesRetenidas: arbRegiones,
});

const arbSuposicion: fc.Arbitrary<Suposicion> = fc.record({
  clave: fc.string({ minLength: 1, maxLength: 40 }),
  valorInferido: fc.string({ minLength: 1, maxLength: 120 }),
  valorActual: fc.string({ minLength: 1, maxLength: 120 }),
  modificada: fc.boolean(),
});

const arbIntentos: fc.Arbitrary<Readonly<Record<FuenteSeccion, number>>> = fc.record({
  agente1: fc.integer({ min: 0, max: 3 }),
  agente2: fc.integer({ min: 0, max: 3 }),
  agente3: fc.integer({ min: 0, max: 3 }),
  agente4: fc.integer({ min: 0, max: 3 }),
});

export const arbEstadoUI: fc.Arbitrary<EstadoUI> = fc.record({
  versionEsquema: fc.constant(1 as const),
  pantalla: arbPantalla,
  estadoGeneracion: arbEstadoGeneracion,
  entrada: arbEntradaFormulario,
  suposiciones: fc.array(arbSuposicion, { minLength: 0, maxLength: 12 }),
  reporte: arbReporte,
  pestanaActiva: arbPestanaActiva,
  intentos: arbIntentos,
  mascotaOculta: fc.boolean(),
});

export { arbEntradaFormulario, arbSuposicion, arbIntentos, arbEstadoGeneracion, arbPantalla, arbPestanaActiva };
