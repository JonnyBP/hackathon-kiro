// Unit tests for ComplianceReportJsonMockLoader (Requirements 16.10, 21.7)
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, rm, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ComplianceReportJsonMockLoader } from "@/infrastructure/mocks/compliance-mock-loader";
import { ValidationError, FilesystemError } from "@/domain/errors";

const validReport = {
  riskLevel: "medium",
  dataTypes: [{ name: "Email", collected: false }],
  regulations: [
    { name: "GDPR", status: "verification-required", reason: "EU scope unknown" },
  ],
  checklist: [
    {
      category: "Legal Documents",
      items: [{ label: "Publish a privacy notice", checked: false }],
    },
  ],
};

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "compliance-mock-loader-test-"));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true }).catch(() => {});
});

describe("ComplianceReportJsonMockLoader", () => {
  it("loads and validates the repository mock file", async () => {
    const report = await new ComplianceReportJsonMockLoader().load();

    expect(["low", "medium", "high"]).toContain(report.riskLevel);
    expect(report.regulations.length).toBeGreaterThan(0);
    expect(report.checklist.map((group) => group.category)).toContain(
      "Legal Documents",
    );
    expect(report.checklist.map((group) => group.category)).toContain(
      "Open-Source Licenses",
    );
  });

  it("keeps every regulation status inside the four-level scale", async () => {
    const report = await new ComplianceReportJsonMockLoader().load();

    for (const regulation of report.regulations) {
      expect([
        "mandatory",
        "verification-required",
        "recommended",
        "not-applicable",
      ]).toContain(regulation.status);
    }
  });

  it("loads a valid file from an explicit path", async () => {
    const filePath = join(tempDir, "valid.json");
    await writeFile(filePath, JSON.stringify(validReport), "utf-8");

    const report = await new ComplianceReportJsonMockLoader(filePath).load();

    expect(report.riskLevel).toBe("medium");
  });

  it("throws FilesystemError when the file is missing", async () => {
    const loader = new ComplianceReportJsonMockLoader(
      join(tempDir, "nonexistent.json"),
    );

    await expect(loader.load()).rejects.toThrow(FilesystemError);
    await expect(loader.load()).rejects.toMatchObject({
      category: "FILESYSTEM",
      operation: "mock-loading",
    });
  });

  it("throws ValidationError when the file contains invalid JSON", async () => {
    const filePath = join(tempDir, "broken.json");
    await writeFile(filePath, "{{{", "utf-8");

    const loader = new ComplianceReportJsonMockLoader(filePath);

    await expect(loader.load()).rejects.toThrow(ValidationError);
    await expect(loader.load()).rejects.toMatchObject({
      category: "VALIDATION",
      operation: "mock-loading",
    });
  });

  it("throws ValidationError with the field path when the report is malformed", async () => {
    const malformed = { ...validReport, riskLevel: "critical" };
    const filePath = join(tempDir, "malformed.json");
    await writeFile(filePath, JSON.stringify(malformed), "utf-8");

    const loader = new ComplianceReportJsonMockLoader(filePath);

    try {
      await loader.load();
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).fieldPath).toBe("riskLevel");
    }
  });
});
