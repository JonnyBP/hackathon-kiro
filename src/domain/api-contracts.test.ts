// Unit tests for the four endpoint request contracts (Requirement 21.2)
import { describe, it, expect } from "vitest";
import {
  ComplianceRequestSchema,
  DevSecOpsRequestSchema,
  MarketRequestSchema,
  SpecRequestSchema,
} from "@/domain/api-contracts";

const validBrief = {
  projectName: "KiroSpec Studio",
  productVision: "Turn an idea into a validated plan",
  targetAudience: "Small software teams",
  valueProposition: "Weeks of planning in minutes",
  mvpFeatures: ["Market report", "Architecture spec"],
  expectedMetrics: {
    mvpMonthlyUsers: 500,
    scaleMonthlyUsers: 50000,
    peakConcurrentConnections: 200,
  },
};

describe("MarketRequestSchema", () => {
  it("accepts a brief without optional fields", () => {
    expect(MarketRequestSchema.safeParse({ brief: validBrief }).success).toBe(
      true,
    );
  });

  it("accepts up to six regions and a constraints note", () => {
    const result = MarketRequestSchema.safeParse({
      brief: validBrief,
      regions: ["México", "LATAM", "USA", "Europa", "Asia", "Global"],
      constraints: "No vendor lock-in",
    });

    expect(result.success).toBe(true);
  });

  it("rejects more than six regions", () => {
    const result = MarketRequestSchema.safeParse({
      brief: validBrief,
      regions: ["a", "b", "c", "d", "e", "f", "g"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a missing brief", () => {
    const result = MarketRequestSchema.safeParse({});

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]!.path).toEqual(["brief"]);
  });

  it("rejects an incomplete brief", () => {
    const result = MarketRequestSchema.safeParse({
      brief: { projectName: "X" },
    });

    expect(result.success).toBe(false);
  });

  it("rejects constraints longer than 500 characters", () => {
    const result = MarketRequestSchema.safeParse({
      brief: validBrief,
      constraints: "x".repeat(501),
    });

    expect(result.success).toBe(false);
  });
});

describe("SpecRequestSchema", () => {
  it("accepts agent1Output with a preferred stack", () => {
    const result = SpecRequestSchema.safeParse({
      agent1Output: validBrief,
      preferredStack: ["Next.js", "PostgreSQL"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects a request without agent1Output", () => {
    expect(SpecRequestSchema.safeParse({}).success).toBe(false);
  });

  it("rejects more than twenty stack entries", () => {
    const result = SpecRequestSchema.safeParse({
      agent1Output: validBrief,
      preferredStack: Array.from({ length: 21 }, (_, i) => `tech-${i}`),
    });

    expect(result.success).toBe(false);
  });
});

describe("ComplianceRequestSchema", () => {
  it("accepts a brief with no technical facts", () => {
    expect(
      ComplianceRequestSchema.safeParse({ brief: validBrief }).success,
    ).toBe(true);
  });

  it("accepts an optional techSteering block", () => {
    const result = ComplianceRequestSchema.safeParse({
      brief: validBrief,
      techSteering: {
        stack: ["Next.js"],
        architecturePattern: "Clean",
        solidBoundaries: [
          { principle: "SRP", rule: "One reason to change", layer: "Domain" },
        ],
        securityGuards: [
          { name: "Zod", description: "Validation", enforcement: "Handler" },
        ],
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid architecture pattern inside techSteering", () => {
    const result = ComplianceRequestSchema.safeParse({
      brief: validBrief,
      techSteering: {
        stack: ["Next.js"],
        architecturePattern: "Layered",
        solidBoundaries: [
          { principle: "SRP", rule: "One reason to change", layer: "Domain" },
        ],
        securityGuards: [
          { name: "Zod", description: "Validation", enforcement: "Handler" },
        ],
      },
    });

    expect(result.success).toBe(false);
  });
});

describe("DevSecOpsRequestSchema (decision D7)", () => {
  it("accepts a body with only the project name", () => {
    const result = DevSecOpsRequestSchema.safeParse({
      projectName: "KiroSpec Studio",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.stack).toBeUndefined();
    expect(result.data.taskList).toBeUndefined();
    expect(result.data.complianceReport).toBeUndefined();
  });

  it("accepts a fully populated body", () => {
    const result = DevSecOpsRequestSchema.safeParse({
      projectName: "KiroSpec Studio",
      stack: ["TypeScript"],
      architecturePattern: "Clean",
      securityPolicies: [
        { name: "Zod", description: "Validation", enforcement: "Handler" },
      ],
      taskList: [
        { id: "t1", title: "Setup", description: "Init", dependencies: [] },
      ],
      complianceReport: {
        licenseSummary: [{ package: "zod", license: "MIT" }],
        regulatoryFlags: [],
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects a missing project name", () => {
    expect(DevSecOpsRequestSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an empty stack when the field is present", () => {
    const result = DevSecOpsRequestSchema.safeParse({
      projectName: "X",
      stack: [],
    });

    expect(result.success).toBe(false);
  });

  it("accepts a task item without dependencies (unknown items are not validated)", () => {
    const result = DevSecOpsRequestSchema.safeParse({
      projectName: "X",
      taskList: [{ id: "t1", title: "Setup", description: "Init" }],
    });

    expect(result.success).toBe(true);
  });
});
