// Unit tests for domain schemas
import { describe, it, expect } from "vitest";
import {
  Agent1OutputSchema,
  Agent2OutputSchema,
  TechSteeringSchema,
  DesignSchema,
  TaskItemSchema,
  ExpectedMetricsSchema,
} from "@/domain/schemas";

// --- Valid fixtures ---

const validExpectedMetrics = {
  mvpMonthlyUsers: 1000,
  scaleMonthlyUsers: 100000,
  peakConcurrentConnections: 500,
};

const validAgent1Output = {
  projectName: "TestProject",
  productVision: "Build a great product",
  targetAudience: "Developers",
  valueProposition: "Save time",
  mvpFeatures: ["Auth", "Dashboard"],
  expectedMetrics: validExpectedMetrics,
};

const validTechSteering = {
  stack: ["Next.js", "TypeScript", "PostgreSQL"],
  architecturePattern: "Clean" as const,
  solidBoundaries: [
    {
      principle: "Single Responsibility",
      rule: "One reason to change",
      layer: "Domain",
    },
  ],
  securityGuards: [
    {
      name: "JWT Auth",
      description: "Token-based auth",
      enforcement: "Middleware",
    },
  ],
};

const validDesign = {
  domainEntities: [
    {
      name: "User",
      properties: [{ name: "id", type: "string", required: true }],
      relationships: ["Order"],
    },
  ],
  mermaidDiagram: "sequenceDiagram\n  A->>B: Hello",
  iamPolicySummary: [
    {
      service: "Lambda",
      actions: ["invoke"],
      resource: "*",
      effect: "Allow" as const,
    },
  ],
  awsCostProjection: {
    mvpMonthlyCostUsd: [{ service: "Lambda", monthlyCostUsd: 5.5 }],
    scaleMonthlyCostUsd: [{ service: "Lambda", monthlyCostUsd: 55 }],
  },
};

const validTasks = [
  {
    id: "task-1",
    title: "Setup project",
    description: "Initialize repo",
    dependencies: [],
  },
  {
    id: "task-2",
    title: "Add auth",
    description: "Implement JWT",
    dependencies: ["task-1"],
  },
];

const validAgent2Output = {
  techSteering: validTechSteering,
  requirements: "WHEN user logs in, THE system SHALL authenticate credentials",
  design: validDesign,
  tasks: validTasks,
};

// --- Tests ---

describe("ExpectedMetricsSchema", () => {
  it("accepts valid metrics", () => {
    const result = ExpectedMetricsSchema.safeParse(validExpectedMetrics);
    expect(result.success).toBe(true);
  });

  it("rejects zero values (must be positive)", () => {
    const result = ExpectedMetricsSchema.safeParse({
      mvpMonthlyUsers: 0,
      scaleMonthlyUsers: 100,
      peakConcurrentConnections: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative values", () => {
    const result = ExpectedMetricsSchema.safeParse({
      mvpMonthlyUsers: -1,
      scaleMonthlyUsers: 100,
      peakConcurrentConnections: 10,
    });
    expect(result.success).toBe(false);
  });
});

describe("Agent1OutputSchema", () => {
  it("accepts valid Agent1 output", () => {
    const result = Agent1OutputSchema.safeParse(validAgent1Output);
    expect(result.success).toBe(true);
  });

  it("rejects empty projectName", () => {
    const result = Agent1OutputSchema.safeParse({
      ...validAgent1Output,
      projectName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty mvpFeatures array", () => {
    const result = Agent1OutputSchema.safeParse({
      ...validAgent1Output,
      mvpFeatures: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects mvpFeatures with empty strings", () => {
    const result = Agent1OutputSchema.safeParse({
      ...validAgent1Output,
      mvpFeatures: [""],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing nested expectedMetrics fields", () => {
    const result = Agent1OutputSchema.safeParse({
      ...validAgent1Output,
      expectedMetrics: { mvpMonthlyUsers: 100 },
    });
    expect(result.success).toBe(false);
  });
});

describe("TechSteeringSchema", () => {
  it("accepts valid tech steering", () => {
    const result = TechSteeringSchema.safeParse(validTechSteering);
    expect(result.success).toBe(true);
  });

  it("rejects invalid architecture pattern", () => {
    const result = TechSteeringSchema.safeParse({
      ...validTechSteering,
      architecturePattern: "MVC",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty stack array", () => {
    const result = TechSteeringSchema.safeParse({
      ...validTechSteering,
      stack: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty solidBoundaries", () => {
    const result = TechSteeringSchema.safeParse({
      ...validTechSteering,
      solidBoundaries: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty securityGuards", () => {
    const result = TechSteeringSchema.safeParse({
      ...validTechSteering,
      securityGuards: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("DesignSchema", () => {
  it("accepts valid design", () => {
    const result = DesignSchema.safeParse(validDesign);
    expect(result.success).toBe(true);
  });

  it("rejects empty domainEntities", () => {
    const result = DesignSchema.safeParse({
      ...validDesign,
      domainEntities: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty mermaidDiagram", () => {
    const result = DesignSchema.safeParse({
      ...validDesign,
      mermaidDiagram: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects entity with empty properties array", () => {
    const result = DesignSchema.safeParse({
      ...validDesign,
      domainEntities: [{ name: "User", properties: [], relationships: [] }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects cost projection with empty service cost arrays", () => {
    const result = DesignSchema.safeParse({
      ...validDesign,
      awsCostProjection: {
        mvpMonthlyCostUsd: [],
        scaleMonthlyCostUsd: [{ service: "Lambda", monthlyCostUsd: 10 }],
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("TaskItemSchema", () => {
  it("accepts valid task item", () => {
    const result = TaskItemSchema.safeParse(validTasks[0]);
    expect(result.success).toBe(true);
  });

  it("rejects empty id", () => {
    const result = TaskItemSchema.safeParse({ ...validTasks[0], id: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = TaskItemSchema.safeParse({ ...validTasks[0], title: "" });
    expect(result.success).toBe(false);
  });

  it("accepts task with empty dependencies array", () => {
    const result = TaskItemSchema.safeParse({
      id: "task-1",
      title: "First",
      description: "No deps",
      dependencies: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("Agent2OutputSchema", () => {
  it("accepts valid Agent2 output", () => {
    const result = Agent2OutputSchema.safeParse(validAgent2Output);
    expect(result.success).toBe(true);
  });

  it("rejects empty requirements string", () => {
    const result = Agent2OutputSchema.safeParse({
      ...validAgent2Output,
      requirements: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty tasks array", () => {
    const result = Agent2OutputSchema.safeParse({
      ...validAgent2Output,
      tasks: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing techSteering", () => {
    const { techSteering, ...rest } = validAgent2Output;
    const result = Agent2OutputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("reports correct path for nested validation errors", () => {
    const invalid = {
      ...validAgent2Output,
      design: {
        ...validDesign,
        iamPolicySummary: [
          { service: "", actions: ["invoke"], resource: "*", effect: "Allow" },
        ],
      },
    };
    const result = Agent2OutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.includes("iamPolicySummary"))).toBe(true);
    }
  });
});
