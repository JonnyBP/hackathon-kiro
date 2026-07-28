// src/__tests__/generators/arb-grafo-tareas.ts — Task graph generators for property testing
import fc from "fast-check";
import type { TaskItem } from "@/domain/types";

/**
 * Generates an acyclic task graph with valid dependency ordering.
 * Tasks only reference earlier tasks as dependencies.
 */
export const arbGrafoAciclico: fc.Arbitrary<TaskItem[]> = fc
  .integer({ min: 1, max: 20 })
  .chain((count) =>
    fc.array(
      fc.record({
        title: fc.string({ minLength: 1, maxLength: 80 }),
        description: fc.string({ minLength: 1, maxLength: 200 }),
      }),
      { minLength: count, maxLength: count },
    ).map((items) =>
      items.map((item, idx) => {
        const id = `task-${idx + 1}`;
        // Only depend on earlier tasks
        const possibleDeps = Array.from({ length: idx }, (_, i) => `task-${i + 1}`);
        const depCount = Math.min(possibleDeps.length, 3);
        const dependencies = possibleDeps.slice(0, depCount);
        return { id, title: item.title, description: item.description, dependencies };
      }),
    ),
  );

/**
 * Generates a cyclic task graph (A→B→C→A).
 */
export const arbGrafoCiclico: fc.Arbitrary<TaskItem[]> = fc
  .integer({ min: 3, max: 10 })
  .chain((count) =>
    fc.array(
      fc.record({
        title: fc.string({ minLength: 1, maxLength: 80 }),
        description: fc.string({ minLength: 1, maxLength: 200 }),
      }),
      { minLength: count, maxLength: count },
    ).map((items) =>
      items.map((item, idx) => {
        const id = `task-${idx + 1}`;
        // Each task depends on the next, last depends on first → cycle
        const nextIdx = (idx + 1) % count;
        const dependencies = [`task-${nextIdx + 1}`];
        return { id, title: item.title, description: item.description, dependencies };
      }),
    ),
  );

/**
 * Generates a task graph with unknown dependency IDs (references to non-existent tasks).
 */
export const arbGrafoConDepsDesconocidas: fc.Arbitrary<TaskItem[]> = fc
  .integer({ min: 2, max: 10 })
  .chain((count) =>
    fc.tuple(
      fc.array(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 80 }),
          description: fc.string({ minLength: 1, maxLength: 200 }),
        }),
        { minLength: count, maxLength: count },
      ),
      fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
    ).map(([items, unknownIds]) =>
      items.map((item, idx) => {
        const id = `task-${idx + 1}`;
        // Mix valid and unknown dependencies
        const dependencies = idx > 0 ? [`task-${idx}`, unknownIds[idx % unknownIds.length]!] : [unknownIds[0]!];
        return { id, title: item.title, description: item.description, dependencies };
      }),
    ),
  );

/**
 * Generates a task graph with duplicate task IDs.
 */
export const arbGrafoConDuplicados: fc.Arbitrary<TaskItem[]> = fc
  .integer({ min: 3, max: 10 })
  .chain((count) =>
    fc.array(
      fc.record({
        title: fc.string({ minLength: 1, maxLength: 80 }),
        description: fc.string({ minLength: 1, maxLength: 200 }),
      }),
      { minLength: count, maxLength: count },
    ).map((items) =>
      items.map((item, idx) => {
        // First two tasks share the same ID
        const id = idx < 2 ? "task-duplicate" : `task-${idx + 1}`;
        const dependencies: string[] = idx > 1 ? ["task-duplicate"] : [];
        return { id, title: item.title, description: item.description, dependencies };
      }),
    ),
  );

/**
 * Generates an empty task graph.
 */
export const arbGrafoVacio: fc.Arbitrary<TaskItem[]> = fc.constant([]);

/**
 * Generates any kind of task graph: acyclic, cyclic, with unknown deps, duplicates, or empty.
 */
export const arbGrafoTareas: fc.Arbitrary<TaskItem[]> = fc.oneof(
  arbGrafoAciclico,
  arbGrafoCiclico,
  arbGrafoConDepsDesconocidas,
  arbGrafoConDuplicados,
  arbGrafoVacio,
);
