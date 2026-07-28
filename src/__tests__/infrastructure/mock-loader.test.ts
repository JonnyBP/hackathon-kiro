// Unit tests for JsonMockLoader
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, mkdir, rm, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { JsonMockLoader } from "@/infrastructure/mocks/mock-loader";
import { ValidationError, FilesystemError } from "@/domain/errors";

const validMockData = {
  projectName: "TestProject",
  productVision: "Build something great",
  targetAudience: "Developers",
  valueProposition: "Save time and effort",
  mvpFeatures: ["Authentication", "Dashboard"],
  expectedMetrics: {
    mvpMonthlyUsers: 1000,
    scaleMonthlyUsers: 100000,
    peakConcurrentConnections: 500,
  },
};

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mock-loader-test-"));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true }).catch(() => {});
});

describe("JsonMockLoader", () => {
  it("loads and parses a valid mock file", async () => {
    const filePath = join(tempDir, "valid.json");
    await writeFile(filePath, JSON.stringify(validMockData), "utf-8");

    const loader = new JsonMockLoader(filePath);
    const result = await loader.load();

    expect(result).toEqual(validMockData);
  });

  it("throws FilesystemError when file is missing", async () => {
    const loader = new JsonMockLoader(join(tempDir, "nonexistent.json"));

    await expect(loader.load()).rejects.toThrow(FilesystemError);
    await expect(loader.load()).rejects.toMatchObject({
      category: "FILESYSTEM",
      operation: "mock-loading",
    });
  });

  it("throws ValidationError when file contains invalid JSON", async () => {
    const filePath = join(tempDir, "invalid-json.json");
    await writeFile(filePath, "{ not valid json !!!", "utf-8");

    const loader = new JsonMockLoader(filePath);

    await expect(loader.load()).rejects.toThrow(ValidationError);
    await expect(loader.load()).rejects.toMatchObject({
      category: "VALIDATION",
      operation: "mock-loading",
    });
  });

  it("throws ValidationError with field path when mock is malformed", async () => {
    const malformedData = {
      projectName: "Test",
      // Missing required fields: productVision, targetAudience, etc.
    };
    const filePath = join(tempDir, "malformed.json");
    await writeFile(filePath, JSON.stringify(malformedData), "utf-8");

    const loader = new JsonMockLoader(filePath);

    try {
      await loader.load();
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as InstanceType<typeof ValidationError>;
      expect(validationError.fieldPath).toBeDefined();
      expect(validationError.operation).toBe("mock-loading");
    }
  });

  it("throws ValidationError with correct field path for nested issues", async () => {
    const nestedInvalid = {
      ...validMockData,
      expectedMetrics: {
        mvpMonthlyUsers: -1, // Must be positive
        scaleMonthlyUsers: 100000,
        peakConcurrentConnections: 500,
      },
    };
    const filePath = join(tempDir, "nested-invalid.json");
    await writeFile(filePath, JSON.stringify(nestedInvalid), "utf-8");

    const loader = new JsonMockLoader(filePath);

    try {
      await loader.load();
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as InstanceType<typeof ValidationError>;
      expect(validationError.fieldPath).toContain("expectedMetrics");
    }
  });
});
