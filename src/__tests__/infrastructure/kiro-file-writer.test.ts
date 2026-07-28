// Unit tests for KiroFileWriter
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  readFile,
  rm,
  mkdtemp,
  stat,
  writeFile,
  chmod,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { KiroFileWriter } from "@/infrastructure/writers/kiro-file-writer";
import { FilesystemError } from "@/domain/errors";
import { Agent2Output } from "@/domain/types";

const validOutput: Agent2Output = {
  techSteering: {
    stack: ["Next.js", "TypeScript", "PostgreSQL"],
    architecturePattern: "Clean",
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
        description: "Token-based authentication",
        enforcement: "Middleware",
      },
    ],
  },
  requirements: "WHEN user logs in, THE system SHALL authenticate credentials",
  design: {
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
        resource: "arn:aws:lambda:*",
        effect: "Allow",
      },
    ],
    awsCostProjection: {
      mvpMonthlyCostUsd: [{ service: "Lambda", monthlyCostUsd: 5.5 }],
      scaleMonthlyCostUsd: [{ service: "Lambda", monthlyCostUsd: 55.0 }],
    },
  },
  tasks: [
    {
      id: "task-1",
      title: "Setup project",
      description: "Initialize the repository",
      dependencies: [],
    },
    {
      id: "task-2",
      title: "Add auth",
      description: "Implement JWT authentication",
      dependencies: ["task-1"],
    },
  ],
};

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "kiro-writer-test-"));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true }).catch(() => {});
});

describe("KiroFileWriter", () => {
  it("creates directory structure before writing", async () => {
    const writer = new KiroFileWriter();
    const basePath = join(tempDir, "dir-test");

    await writer.writeAll(validOutput, basePath);

    const steeringDir = await stat(join(basePath, "steering"));
    expect(steeringDir.isDirectory()).toBe(true);

    const specsDir = await stat(join(basePath, "specs"));
    expect(specsDir.isDirectory()).toBe(true);
  });

  it("writes all 4 expected files", async () => {
    const writer = new KiroFileWriter();
    const basePath = join(tempDir, "files-test");

    await writer.writeAll(validOutput, basePath);

    const techContent = await readFile(
      join(basePath, "steering/tech.md"),
      "utf-8",
    );
    const reqContent = await readFile(
      join(basePath, "specs/requirements.md"),
      "utf-8",
    );
    const designContent = await readFile(
      join(basePath, "specs/design.md"),
      "utf-8",
    );
    const tasksContent = await readFile(
      join(basePath, "specs/tasks.md"),
      "utf-8",
    );

    // Tech steering contains expected sections
    expect(techContent).toContain("## Stack Selection");
    expect(techContent).toContain("Next.js");
    expect(techContent).toContain("## Architecture Pattern");
    expect(techContent).toContain("Clean");
    expect(techContent).toContain("## SOLID Boundaries");
    expect(techContent).toContain("Single Responsibility");
    expect(techContent).toContain("## Security Policies");
    expect(techContent).toContain("JWT Auth");

    // Requirements preserved verbatim
    expect(reqContent).toBe(validOutput.requirements);

    // Design contains expected sections
    expect(designContent).toContain("## Domain Entities");
    expect(designContent).toContain("User");
    expect(designContent).toContain("## Sequence Diagram");
    expect(designContent).toContain("```mermaid");
    expect(designContent).toContain("## IAM Policies");
    expect(designContent).toContain("Lambda");
    expect(designContent).toContain("## AWS Cost Projection");
    expect(designContent).toContain("$5.50");

    // Tasks contains expected content
    expect(tasksContent).toContain("## Tasks");
    expect(tasksContent).toContain("task-1");
    expect(tasksContent).toContain("Setup project");
    expect(tasksContent).toContain("depends on: task-1");
  });

  it("throws FilesystemError when write fails", async () => {
    const writer = new KiroFileWriter();
    // Use a path that will fail (file as directory)
    const blockingFile = join(tempDir, "blocking-file");
    await writeFile(blockingFile, "I am a file, not a directory", "utf-8");

    // Try to write inside what is actually a file
    const badBasePath = join(blockingFile, "subpath");

    await expect(writer.writeAll(validOutput, badBasePath)).rejects.toThrow(
      FilesystemError,
    );
    await expect(
      writer.writeAll(validOutput, badBasePath),
    ).rejects.toMatchObject({
      category: "FILESYSTEM",
      operation: "file-write",
    });
  });
});
