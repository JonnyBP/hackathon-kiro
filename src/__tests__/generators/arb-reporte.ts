// src/__tests__/generators/arb-reporte.ts — Arbitrary Reporte objects covering all 3^6 EstadoSeccion combinations
import fc from "fast-check";
import type {
  Reporte,
  EstadoSeccion,
  MotivoNoDisponible,
  VistaMercado,
  VistaTecnico,
  VistaCostos,
  VistaCompliance,
  VistaTareas,
  VistaDevSecOps,
} from "@/domain/view-model";
import type { Agent1Output } from "@/domain/types";

const arbMotivo: fc.Arbitrary<MotivoNoDisponible> = fc.constantFrom(
  "fallo_del_agente",
  "esquema_invalido",
  "error_de_red",
  "tiempo_limite",
);

function arbEstadoSeccion<T>(arbDatos: fc.Arbitrary<T>): fc.Arbitrary<EstadoSeccion<T>> {
  return fc.oneof(
    fc.constant({ estado: "pendiente" as const }),
    arbDatos.map((datos) => ({ estado: "disponible" as const, datos })),
    arbMotivo.map((motivo) => ({ estado: "no_disponible" as const, motivo })),
  );
}

const arbAgent1Output: fc.Arbitrary<Agent1Output> = fc.record({
  projectName: fc.string({ minLength: 1, maxLength: 50 }),
  productVision: fc.string({ minLength: 1, maxLength: 200 }),
  targetAudience: fc.string({ minLength: 1, maxLength: 200 }),
  valueProposition: fc.string({ minLength: 1, maxLength: 200 }),
  mvpFeatures: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
  expectedMetrics: fc.record({
    mvpMonthlyUsers: fc.nat({ max: 100000 }),
    scaleMonthlyUsers: fc.nat({ max: 10000000 }),
    peakConcurrentConnections: fc.nat({ max: 50000 }),
  }),
});

// Minimal valid data for "disponible" variants
const arbVistaMercado: fc.Arbitrary<VistaMercado> = fc.constant(undefined as unknown as VistaMercado);
const arbVistaTecnico: fc.Arbitrary<VistaTecnico> = fc.constant(undefined as unknown as VistaTecnico);
const arbVistaCostos: fc.Arbitrary<VistaCostos> = fc.constant(undefined as unknown as VistaCostos);
const arbVistaCompliance: fc.Arbitrary<VistaCompliance> = fc.constant(undefined as unknown as VistaCompliance);
const arbVistaTareas: fc.Arbitrary<VistaTareas> = fc.constant(undefined as unknown as VistaTareas);
const arbVistaDevSecOps: fc.Arbitrary<VistaDevSecOps> = fc.constant(undefined as unknown as VistaDevSecOps);

export const arbReporte: fc.Arbitrary<Reporte> = fc.record({
  brief: arbAgent1Output,
  mercado: arbEstadoSeccion<VistaMercado>(arbVistaMercado),
  tecnico: arbEstadoSeccion<VistaTecnico>(arbVistaTecnico),
  costos: arbEstadoSeccion<VistaCostos>(arbVistaCostos),
  compliance: arbEstadoSeccion<VistaCompliance>(arbVistaCompliance),
  tareas: arbEstadoSeccion<VistaTareas>(arbVistaTareas),
  devsecops: arbEstadoSeccion<VistaDevSecOps>(arbVistaDevSecOps),
});

export { arbEstadoSeccion, arbAgent1Output, arbMotivo };
