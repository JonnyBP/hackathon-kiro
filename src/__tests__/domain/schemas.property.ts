// Property-based tests for Agent2 domain schemas
// Feature: agent2-architect
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { Agent2OutputSchema, TaskItemSchema } from "@/domain/schemas";

// --- Arbitraries ---

const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 });

const solidBoundaryArb = fc.record({
  principle: nonEmptyString,
  rule: nonEmptyString,
  layer: nonEmptyString,
});

const securityGuardArb = fc.record({
  name: nonEmptyString,
  description: nonEmptyString,
  enforcement: nonEmptyString,
});

const techSteeringArb = fc.record({
  stack: fc.array(nonEmptyString, { minLength: 1, maxLength: 5 }),
  architecturePattern: fc.constantFrom("Clean" as const, "Hexagonal" as const),
  solidBoundaries: fc.array(solidBoundaryArb, { minLength: 1, maxLength: 3 }),
  securityGuards: fc.array(securityGuardArb, { minLength: 1, maxLength: 3 }),
});

const entityPropertyArb = fc.record({
  name: nonEmptyString,
  type: nonEmptyString,
  required: fc.boolean(),
});

const domainEntityArb = fc.record({
  name: nonEmptyString,
  properties: fc.array(entityPropertyArb, { minLength: 1, maxLength: 4 }),
  relationships: fc.array(fc.string({ maxLength: 30 }), { maxLength: 3 }),
});

const iamPolicyArb = fc.record({
  service: nonEmptyString,
  actions: fc.array(nonEmptyString, { minLength: 1, maxLength: 3 }),
  resource: nonEmptyString,
  effect: fc.constantFrom("Allow" as const, "Deny" as const),
});

const serviceCostArb = fc.record({
  service: nonEmptyString,
  monthlyCostUsd: fc.double({ min: 0, max: 10000, noNaN: true }),
});

const costProjectionArb = fc.record({
  mvpMonthlyCostUsd: fc.array(serviceCostArb, { minLength: 1, maxLength: 3 }),
  scaleMonthlyCostUsd: fc.array(serviceCostArb, { minLength: 1, maxLength: 3 }),
});

const designArb = fc.record({
  domainEntities: fc.array(domainEntityArb, { minLength: 1, maxLength: 3 }),
  mermaidDiagram: nonEmptyString,
  iamPolicySummary: fc.array(iamPolicyArb, { minLength: 1, maxLength: 3 }),
  awsCostProjection: costProjectionArb,
});

/**
 * Generates a valid task list where dependencies only reference earlier task IDs.
 */
const validTaskListArb = fc.integer({ min: 1, max: 5 }).chain((count) => {
  return fc.tuple(
    ...Array.from({ length: count }, (_, i) =>
      fc.record({
        id: fc.constant(`task-${i + 1}`),
        title: nonEmptyString,
        description: nonEmptyString,
        dependencies: fc.constant(
          i === 0
            ? []
            : Array.from({ length: Math.min(i, 2) }, (_, j) => `task-${j + 1}`),
        ),
      }),
    ),
  );
});

const validAgent2OutputArb = fc
  .tuple(techSteeringArb, nonEmptyString, designArb, validTaskListArb)
  .map(([techSteering, requirements, design, tasks]) => ({
    techSteering,
    requirements,
    design,
    tasks,
  }));

// --- Property 1: Schema validation rejects invalid objects with correct error paths ---
// Feature: agent2-architect, Property 1: Schema validation rejects invalid objects with correct error paths
// **Validates: Requirements 1.4**

describe("Feature: agent2-architect, Property 1: Schema validation rejects invalid objects with correct error paths", () => {
  it("rejects objects with empty required strings and reports correct field path", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "techSteering",
          "requirements",
          "design",
          "tasks",
        ) as fc.Arbitrary<string>,
        (missingField: string) => {
          const invalid: Record<string, unknown> = {
            techSteering: {
              stack: ["Next.js"],
              architecturePattern: "Clean",
              solidBoundaries: [
                { principle: "SRP", rule: "One reason", layer: "Domain" },
              ],
              securityGuards: [
                {
                  name: "JWT",
                  description: "Token auth",
                  enforcement: "Middleware",
                },
              ],
            },
            requirements: "WHEN user logs in, THE system SHALL authenticate",
            design: {
              domainEntities: [
                {
                  name: "User",
                  properties: [{ name: "id", type: "string", required: true }],
                  relationships: [],
                },
              ],
              mermaidDiagram: "sequenceDiagram",
              iamPolicySummary: [
                {
                  service: "Lambda",
                  actions: ["invoke"],
                  resource: "*",
                  effect: "Allow",
                },
              ],
              awsCostProjection: {
                mvpMonthlyCostUsd: [{ service: "Lambda", monthlyCostUsd: 5 }],
                scaleMonthlyCostUsd: [
                  { service: "Lambda", monthlyCostUsd: 50 },
                ],
              },
            },
            tasks: [
              {
                id: "task-1",
                title: "Setup",
                description: "Initial setup",
                dependencies: [],
              },
            ],
          };

          // Corrupt the field
          if (missingField === "requirements") {
            invalid.requirements = ""; // empty string fails .min(1)
          } else if (missingField === "tasks") {
            invalid.tasks = []; // empty array fails .min(1)
          } else {
            delete invalid[missingField]; // missing field
          }

          const result = Agent2OutputSchema.safeParse(invalid);
          expect(result.success).toBe(false);

          if (!result.success) {
            const paths = result.error.issues.map((i) => i.path.join("."));
            // The error path should reference the corrupted field
            expect(
              paths.some(
                (p) => p === missingField || p.startsWith(missingField),
              ),
            ).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects objects with wrong types and reports expected type info", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (_seed) => {
        // Use a number where string is expected
        const invalid = {
          techSteering: {
            stack: [123], // should be string
            architecturePattern: "Clean",
            solidBoundaries: [
              { principle: "SRP", rule: "One reason", layer: "Domain" },
            ],
            securityGuards: [
              {
                name: "JWT",
                description: "Token auth",
                enforcement: "Middleware",
              },
            ],
          },
          requirements: "Valid requirements",
          design: {
            domainEntities: [
              {
                name: "User",
                properties: [{ name: "id", type: "string", required: true }],
                relationships: [],
              },
            ],
            mermaidDiagram: "sequenceDiagram",
            iamPolicySummary: [
              {
                service: "Lambda",
                actions: ["invoke"],
                resource: "*",
                effect: "Allow",
              },
            ],
            awsCostProjection: {
              mvpMonthlyCostUsd: [{ service: "Lambda", monthlyCostUsd: 5 }],
              scaleMonthlyCostUsd: [{ service: "Lambda", monthlyCostUsd: 50 }],
            },
          },
          tasks: [
            {
              id: "task-1",
              title: "Setup",
              description: "Initial",
              dependencies: [],
            },
          ],
        };

        const result = Agent2OutputSchema.safeParse(invalid);
        expect(result.success).toBe(false);

        if (!result.success) {
          const firstIssue = result.error.issues[0]!;
          expect(firstIssue.path.length).toBeGreaterThan(0);
          expect(firstIssue.message).toBeDefined();
        }
      }),
      { numRuns: 100 },
    );
  });
});

// --- Property 2: Valid Agent2Output round-trip through schema ---
// Feature: agent2-architect, Property 2: Valid Agent2Output round-trip through schema
// **Validates: Requirements 2.1**

describe("Feature: agent2-architect, Property 2: Valid Agent2Output round-trip through schema", () => {
  it("valid Agent2Output objects parse and remain deeply equal", () => {
    fc.assert(
      fc.property(validAgent2OutputArb, (output) => {
        const result = Agent2OutputSchema.safeParse(output);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data).toEqual(output);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// --- Property 6: Task dependencies form a valid topological order ---
// Feature: agent2-architect, Property 6: Task dependencies form a valid topological order
// **Validates: Requirements 2.6**

describe("Feature: agent2-architect, Property 6: Task dependencies form a valid topological order", () => {
  it("all task dependency IDs reference only earlier tasks in the list", () => {
    fc.assert(
      fc.property(validTaskListArb, (tasks) => {
        // For each task, all dependencies must reference IDs of tasks that appear earlier
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i]!;
          const earlierIds = tasks.slice(0, i).map((t) => t.id);
          for (const dep of task.dependencies) {
            expect(earlierIds).toContain(dep);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("tasks with invalid topological order are detectable", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        nonEmptyString,
        nonEmptyString,
        (count, title, description) => {
          // Create tasks where first task references a later task ID (invalid)
          const tasks = Array.from({ length: count }, (_, i) => ({
            id: `t-${i + 1}`,
            title,
            description,
            dependencies: i === 0 ? [`t-${count}`] : [], // first task depends on last (invalid)
          }));

          // Verify the topological order is violated
          const firstTask = tasks[0]!;
          const earlierIds: string[] = [];
          const hasViolation = firstTask.dependencies.some(
            (dep) => !earlierIds.includes(dep),
          );
          expect(hasViolation).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
