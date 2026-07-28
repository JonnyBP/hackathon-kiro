// src/application/view/selectors/task-view.ts — Task section view selector (pure TS, no React)

import type { TaskItem } from "@/domain/types";

export interface TaskViewItem {
  id: string;
  title: string;
  description: string;
  dependencies: string[];
  nivel: number;
  enCiclo: boolean;
  depDesconocida: boolean;
}

export interface TaskLevelGroup {
  nivel: number;
  tareas: TaskViewItem[];
}

export interface TaskViewResult {
  totalTareas: number;
  primeraTareaEjecutable: string | null;
  niveles: TaskLevelGroup[];
  ciclos: TaskViewItem[];
  duplicados: Set<string>;
}

const MAX_TASKS = 300;
const MAX_LEVELS = 20;

export function calcularVistaDeTareas(tasks: TaskItem[]): TaskViewResult {
  // Cap input
  const capped = tasks.slice(0, MAX_TASKS);

  // Detect duplicates
  const idCount = new Map<string, number>();
  for (const t of capped) {
    idCount.set(t.id, (idCount.get(t.id) ?? 0) + 1);
  }
  const duplicados = new Set<string>();
  for (const [id, count] of idCount) {
    if (count > 1) duplicados.add(id);
  }

  // Build adjacency (only known deps)
  const knownIds = new Set(capped.map((t) => t.id));

  // DFS cycle detection using coloring: 0=white, 1=gray, 2=black
  const color = new Map<string, number>();
  const inCycle = new Set<string>();

  // Adjacency: task id -> list of dependency ids (edges point from dep -> task for topological)
  // For cycle detection we need: task depends on dep means edge task -> dep in "depends on" graph
  // Actually for topological sort: edge from dep -> task (dep must come first)
  // For DFS cycle detection we traverse deps as predecessors

  // Build graph: for each task, outgoing edges are its dependencies
  const adjForward = new Map<string, string[]>(); // task -> deps it depends on
  for (const t of capped) {
    const knownDeps = t.dependencies.filter((d) => knownIds.has(d));
    adjForward.set(t.id, knownDeps);
    color.set(t.id, 0);
  }

  function dfs(nodeId: string): boolean {
    color.set(nodeId, 1); // gray
    const deps = adjForward.get(nodeId) ?? [];
    for (const dep of deps) {
      const depColor = color.get(dep);
      if (depColor === 1) {
        // Back edge — cycle found
        inCycle.add(nodeId);
        inCycle.add(dep);
        return true;
      }
      if (depColor === 0) {
        if (dfs(dep)) {
          inCycle.add(nodeId);
        }
      }
    }
    color.set(nodeId, 2); // black
    return false;
  }

  for (const t of capped) {
    if (color.get(t.id) === 0) {
      dfs(t.id);
    }
  }

  // Compute levels via topological depth (ignoring cycle nodes and unknown deps)
  const levels = new Map<string, number>();

  function computeLevel(nodeId: string, visited: Set<string>): number {
    if (levels.has(nodeId)) return levels.get(nodeId)!;
    if (inCycle.has(nodeId)) return -1;
    if (visited.has(nodeId)) return -1; // safety

    visited.add(nodeId);
    const deps = (adjForward.get(nodeId) ?? []).filter((d) => !inCycle.has(d) && knownIds.has(d));
    let maxDepLevel = -1;
    for (const dep of deps) {
      const depLevel = computeLevel(dep, visited);
      if (depLevel >= 0 && depLevel > maxDepLevel) {
        maxDepLevel = depLevel;
      }
    }
    const level = maxDepLevel + 1;
    levels.set(nodeId, level);
    return level;
  }

  for (const t of capped) {
    if (!inCycle.has(t.id)) {
      computeLevel(t.id, new Set<string>());
    }
  }

  // Mark unknown deps
  const unknownDepsMap = new Map<string, boolean>();
  for (const t of capped) {
    const hasUnknown = t.dependencies.some((d) => !knownIds.has(d));
    unknownDepsMap.set(t.id, hasUnknown);
  }

  // Build view items
  const viewItems: TaskViewItem[] = capped.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    dependencies: t.dependencies,
    nivel: inCycle.has(t.id) ? -1 : (levels.get(t.id) ?? 0),
    enCiclo: inCycle.has(t.id),
    depDesconocida: unknownDepsMap.get(t.id) ?? false,
  }));

  // Group by level (cap at MAX_LEVELS)
  const levelMap = new Map<number, TaskViewItem[]>();
  for (const item of viewItems) {
    if (item.enCiclo) continue;
    const lvl = Math.min(item.nivel, MAX_LEVELS - 1);
    if (!levelMap.has(lvl)) levelMap.set(lvl, []);
    levelMap.get(lvl)!.push({ ...item, nivel: lvl });
  }

  const niveles: TaskLevelGroup[] = [];
  const sortedLevels = [...levelMap.keys()].sort((a, b) => a - b);
  for (const lvl of sortedLevels) {
    niveles.push({ nivel: lvl, tareas: levelMap.get(lvl)! });
  }

  // Cycle items
  const ciclos = viewItems.filter((item) => item.enCiclo);

  // First executable task: first at level 1 (0-indexed, so level 0 = no deps, level 1 = depends on level 0)
  // Interpretation: "level 1" likely means topological depth 1
  const primeraTareaEjecutable = (() => {
    const level1Tasks = niveles.find((g) => g.nivel === 1);
    if (level1Tasks && level1Tasks.tareas.length > 0) {
      return level1Tasks.tareas[0]!.id;
    }
    return null;
  })();

  return {
    totalTareas: capped.length,
    primeraTareaEjecutable,
    niveles,
    ciclos,
    duplicados,
  };
}
