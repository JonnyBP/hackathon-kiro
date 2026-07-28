// Property-based tests for KiroFileWriter
// Feature: agent2-architect, Property 3: File writer preserves all output content
// **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
import { describe, it, expect, afterAll } from "vitest";
import * as fc from "fast-check";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { KiroFileWriter } from "@/infrastructure/writers/kiro-file-writer";
import { Agent2Output } from "@/domain/types";

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
  relationships: fc.array(nonEmptyString, { maxLength: 3 }),
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

const taskItemArb = fc.record({
  id: nonEmptyString,
  title: nonEmptyString,
  description: nonEmptyString,
  dependencies: fc.array(nonEmptyString, { maxLength: 3 }),
});

const validAgent2OutputArb: fc.Arbitrary<Agent2Output> = fc.record({
  techSteering: techSteeringArb,
  requirements: nonEmptyString,
  design: designArb,
  tasks: fc.array(taskItemArb, { minLength: 1, maxLength: 5 }),
});

// --- Cleanup tracking ---
const tempDirs: string[] = [];

afterAll(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

// --- Property 3: File writer preserves all output content ---

describe("Feature: agent2-architect, Property 3: File writer preserves all output content", () => {
  it("written files contain all original data from Agent2Output", async () => {
    const writer = new KiroFileWriter();

    await fc.assert(
      fc.asyncProperty(validAgent2OutputArb, async (output) => {
        // Create a unique temp dir for this iteration
        const tempDir = await mkdtemp(join(tmpdir(), "kiro-fw-"));
        tempDirs.push(tempDir);

        // Write all files
        await writer.writeAll(output, tempDir);

        // Read back each file and verify content preservation
        const techContent = await readFile(
          join(tempDir, "steering/tech.md"),
          "utf-8",
        );
        const reqContent = await readFile(
          join(tempDir, "specs/requirements.md"),
          "utf-8",
        );
        const designContent = await readFile(
          join(tempDir, "specs/design.md"),
          "utf-8",
        );
        const tasksContent = await readFile(
          join(tempDir, "specs/tasks.md"),
          "utf-8",
        );

        // Tech steering: all stack items present
        for (const tech of output.techSteering.stack) {
          expect(techContent).toContain(tech);
        }
        // Architecture pattern present
        expect(techContent).toContain(output.techSteering.architecturePattern);
        // SOLID boundaries present
        for (const boundary of output.techSteering.solidBoundaries) {
          expect(techContent).toContain(boundary.principle);
          expect(techContent).toContain(boundary.rule);
          expect(techContent).toContain(boundary.layer);
        }
        // Security guards present
        for (const guard of output.techSteering.securityGuards) {
          expect(techContent).toContain(guard.name);
          expect(techContent).toContain(guard.description);
          expect(techContent).toContain(guard.enforcement);
        }

        // Requirements preserved verbatim
        expect(reqContent).toBe(output.requirements);

        // Design: domain entities present
        for (const entity of output.design.domainEntities) {
          expect(designContent).toContain(entity.name);
          for (const prop of entity.properties) {
            expect(designContent).toContain(prop.name);
            expect(designContent).toContain(prop.type);
          }
        }
        // Mermaid diagram present
        expect(designContent).toContain(output.design.mermaidDiagram);
        // IAM policies present
        for (const policy of output.design.iamPolicySummary) {
          expect(designContent).toContain(policy.service);
          expect(designContent).toContain(policy.resource);
          expect(designContent).toContain(policy.effect);
          for (const action of policy.actions) {
            expect(designContent).toContain(action);
          }
        }
        // Cost projections present
        for (const cost of output.design.awsCostProjection.mvpMonthlyCostUsd) {
          expect(designContent).toContain(cost.service);
          expect(designContent).toContain(cost.monthlyCostUsd.toFixed(2));
        }
        for (const cost of output.design.awsCostProjection
          .scaleMonthlyCostUsd) {
          expect(designContent).toContain(cost.service);
          expect(designContent).toContain(cost.monthlyCostUsd.toFixed(2));
        }

        // Tasks: all task data present
        for (const task of output.tasks) {
          expect(tasksContent).toContain(task.id);
          expect(tasksContent).toContain(task.title);
          expect(tasksContent).toContain(task.description);
        }

        // Clean up this iteration's temp dir
        await rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }),
      { numRuns: 100 },
    );
  });
});
