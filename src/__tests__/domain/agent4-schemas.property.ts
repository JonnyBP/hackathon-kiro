// Property-based tests for Agent4 domain schemas
// Feature: agent4-devsecops
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  Agent4InputSchema,
  Agent4OutputSchema,
} from "@/domain/schemas";

// --- Arbitraries ---

/**
 * Generates a non-empty trimmed string (no leading/trailing whitespace)
 * suitable for round-trip equality through .trim().min(1) schemas.
 */
const trimmedString = (minLength = 1, maxLength = 50) =>
  fc
    .string({ minLength, maxLength: maxLength + 2 })
    .map((s) => s.trim())
    .filter((s) => s.length >= minLength && s.length <= maxLength);

const trimmedString1to256 = trimmedString(1, 256);
const trimmedString1to64 = trimmedString(1, 64);
const trimmedString1to128 = trimmedString(1, 128);
const trimmedString1to1024 = trimmedString(1, 1024);

const securityPolicyArb = fc.record({
  name: trimmedString1to256,
  description: trimmedString1to256,
  enforcement: trimmedString1to256,
});

const taskItemArb = fc.record({
  id: trimmedString1to64,
  title: trimmedString1to256,
  description: trimmedString1to1024,
  dependencies: fc.array(trimmedString1to64, { minLength: 0, maxLength: 5 }),
});

const licenseEntryArb = fc.record({
  package: trimmedString(1, 50),
  license: trimmedString(1, 50),
});

const complianceReportArb = fc.record({
  licenseSummary: fc.array(licenseEntryArb, { minLength: 1, maxLength: 3 }),
  regulatoryFlags: fc.array(trimmedString(1, 50), { minLength: 0, maxLength: 3 }),
});

const validAgent4InputArb = fc.record({
  projectName: trimmedString1to128,
  stack: fc.array(trimmedString1to64, { minLength: 1, maxLength: 5 }),
  architecturePattern: trimmedString(1, 50),
  securityPolicies: fc.array(securityPolicyArb, { minLength: 1, maxLength: 3 }),
  taskList: fc.array(taskItemArb, { minLength: 1, maxLength: 5 }),
  complianceReport: complianceReportArb,
});

// --- Agent4Output arbitraries ---

/**
 * Generates a valid Dockerfile string with 2+ FROM directives and at least 20 chars.
 */
const dockerfileArb = fc
  .tuple(trimmedString(5, 30), trimmedString(5, 30), trimmedString(5, 30))
  .map(
    ([base1, base2, content]) =>
      `FROM ${base1} AS builder\nRUN ${content}\nFROM ${base2} AS runtime\nCMD ["start"]`,
  );

/**
 * Generates a valid docker-compose string containing "services" and at least 20 chars.
 */
const dockerComposeArb = fc
  .tuple(trimmedString(5, 30), trimmedString(5, 30))
  .map(
    ([svc1, svc2]) =>
      `version: "3"\nservices:\n  ${svc1}:\n    image: alpine\n  ${svc2}:\n    image: alpine`,
  );

/**
 * Generates a valid CI pipeline string containing "jobs" and at least 20 chars.
 */
const ciPipelineArb = fc
  .tuple(trimmedString(5, 30), trimmedString(5, 30))
  .map(
    ([job1, job2]) =>
      `name: CI\non: push\njobs:\n  ${job1}:\n    runs-on: ubuntu\n  ${job2}:\n    runs-on: ubuntu`,
  );

/**
 * Generates a valid hook script string starting with "#!/" and at least 10 chars.
 */
const hookScriptArb = fc
  .string({ minLength: 7, maxLength: 80 })
  .map((s) => `#!/bin/bash\n${s}`);

const hooksArb = fc.record({
  validateSpecs: hookScriptArb,
  scanSecrets: hookScriptArb,
});

const validAgent4OutputArb = fc.record({
  dockerfile: dockerfileArb,
  dockerCompose: dockerComposeArb,
  ciPipeline: ciPipelineArb,
  hooks: hooksArb,
});

// --- Property 1: Valid Agent4Input round-trip through schema ---
// Feature: agent4-devsecops, Property 1: Valid Agent4Input round-trip through schema
// **Validates: Requirements 1.1, 1.2, 1.3, 1.5**

describe("Feature: agent4-devsecops, Property 1: Valid Agent4Input round-trip through schema", () => {
  it("valid Agent4Input objects parse successfully and remain deeply equal", () => {
    fc.assert(
      fc.property(validAgent4InputArb, (input) => {
        const result = Agent4InputSchema.safeParse(input);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data).toEqual(input);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// --- Property 2: Valid Agent4Output round-trip through schema ---
// Feature: agent4-devsecops, Property 2: Valid Agent4Output round-trip through schema
// **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

describe("Feature: agent4-devsecops, Property 2: Valid Agent4Output round-trip through schema", () => {
  it("valid Agent4Output objects parse successfully and remain deeply equal", () => {
    fc.assert(
      fc.property(validAgent4OutputArb, (output) => {
        const result = Agent4OutputSchema.safeParse(output);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data).toEqual(output);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// --- Property 3: Whitespace-only strings are rejected ---
// Feature: agent4-devsecops, Property 3: Whitespace-only strings are rejected
// **Validates: Requirements 1.5**

describe("Feature: agent4-devsecops, Property 3: Whitespace-only strings are rejected", () => {
  const whitespaceArb = fc
    .array(fc.constantFrom(" ", "\t", "\n", "\r", "  ", "\t\t", "\n  \n"), {
      minLength: 1,
      maxLength: 5,
    })
    .map((parts) => parts.join(""));

  const fieldInjectors: Array<{
    name: string;
    inject: (ws: string) => unknown;
    expectedPath: string;
  }> = [
    {
      name: "projectName",
      inject: (ws) => ({
        projectName: ws,
        stack: ["node"],
        architecturePattern: "Clean",
        securityPolicies: [{ name: "a", description: "b", enforcement: "c" }],
        taskList: [{ id: "t1", title: "t", description: "d", dependencies: [] }],
        complianceReport: {
          licenseSummary: [{ package: "p", license: "MIT" }],
          regulatoryFlags: [],
        },
      }),
      expectedPath: "projectName",
    },
    {
      name: "stack[0]",
      inject: (ws) => ({
        projectName: "proj",
        stack: [ws],
        architecturePattern: "Clean",
        securityPolicies: [{ name: "a", description: "b", enforcement: "c" }],
        taskList: [{ id: "t1", title: "t", description: "d", dependencies: [] }],
        complianceReport: {
          licenseSummary: [{ package: "p", license: "MIT" }],
          regulatoryFlags: [],
        },
      }),
      expectedPath: "stack",
    },
    {
      name: "architecturePattern",
      inject: (ws) => ({
        projectName: "proj",
        stack: ["node"],
        architecturePattern: ws,
        securityPolicies: [{ name: "a", description: "b", enforcement: "c" }],
        taskList: [{ id: "t1", title: "t", description: "d", dependencies: [] }],
        complianceReport: {
          licenseSummary: [{ package: "p", license: "MIT" }],
          regulatoryFlags: [],
        },
      }),
      expectedPath: "architecturePattern",
    },
    {
      name: "securityPolicies[0].name",
      inject: (ws) => ({
        projectName: "proj",
        stack: ["node"],
        architecturePattern: "Clean",
        securityPolicies: [{ name: ws, description: "b", enforcement: "c" }],
        taskList: [{ id: "t1", title: "t", description: "d", dependencies: [] }],
        complianceReport: {
          licenseSummary: [{ package: "p", license: "MIT" }],
          regulatoryFlags: [],
        },
      }),
      expectedPath: "securityPolicies",
    },
    {
      name: "taskList[0].id",
      inject: (ws) => ({
        projectName: "proj",
        stack: ["node"],
        architecturePattern: "Clean",
        securityPolicies: [{ name: "a", description: "b", enforcement: "c" }],
        taskList: [{ id: ws, title: "t", description: "d", dependencies: [] }],
        complianceReport: {
          licenseSummary: [{ package: "p", license: "MIT" }],
          regulatoryFlags: [],
        },
      }),
      expectedPath: "taskList",
    },
    {
      name: "complianceReport.licenseSummary[0].package",
      inject: (ws) => ({
        projectName: "proj",
        stack: ["node"],
        architecturePattern: "Clean",
        securityPolicies: [{ name: "a", description: "b", enforcement: "c" }],
        taskList: [{ id: "t1", title: "t", description: "d", dependencies: [] }],
        complianceReport: {
          licenseSummary: [{ package: ws, license: "MIT" }],
          regulatoryFlags: [],
        },
      }),
      expectedPath: "complianceReport",
    },
  ];

  for (const { name, inject, expectedPath } of fieldInjectors) {
    it(`rejects whitespace-only value in field: ${name}`, () => {
      fc.assert(
        fc.property(whitespaceArb, (ws) => {
          const input = inject(ws);
          const result = Agent4InputSchema.safeParse(input);
          expect(result.success).toBe(false);

          if (!result.success) {
            const paths = result.error.issues.map((i) => i.path.join("."));
            expect(
              paths.some(
                (p) => p === expectedPath || p.startsWith(expectedPath),
              ),
            ).toBe(true);
          }
        }),
        { numRuns: 100 },
      );
    });
  }
});
