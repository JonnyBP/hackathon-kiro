// Property-based tests for Agent4FileWriter
// Feature: agent4-devsecops, Properties 7 & 8
// **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.7, 12.5**

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { Agent4FileWriter } from "@/infrastructure/writers/agent4-file-writer";
import { FilesystemError } from "@/domain/errors";
import { Agent4Output } from "@/domain/types";

// Mock node:fs/promises
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  chmod: vi.fn().mockResolvedValue(undefined),
}));

import { writeFile, mkdir, chmod } from "node:fs/promises";

const mockedWriteFile = vi.mocked(writeFile);
const mockedMkdir = vi.mocked(mkdir);
const mockedChmod = vi.mocked(chmod);

// --- Arbitraries ---

/**
 * Generates a valid Agent4Output with content meeting schema constraints.
 * - dockerfile: min 20 chars, contains 2+ "FROM"
 * - dockerCompose: min 20 chars, contains "services"
 * - ciPipeline: min 20 chars, contains "jobs"
 * - hooks: min 10 chars each, start with "#!/"
 */
const validAgent4OutputArb: fc.Arbitrary<Agent4Output> = fc.record({
  dockerfile: fc
    .string({ minLength: 1, maxLength: 100 })
    .map((s) => `FROM node:20-alpine AS builder\n${s}\nFROM node:20-alpine AS runtime\nCMD ["start"]`),
  dockerCompose: fc
    .string({ minLength: 1, maxLength: 100 })
    .map((s) => `version: "3"\nservices:\n  app:\n    image: myapp\n${s}`),
  ciPipeline: fc
    .string({ minLength: 1, maxLength: 100 })
    .map((s) => `name: CI\non: push\njobs:\n  build:\n    runs-on: ubuntu\n${s}`),
  hooks: fc.record({
    validateSpecs: fc
      .string({ minLength: 1, maxLength: 80 })
      .map((s) => `#!/bin/bash\necho 'validate'\n${s}`),
    scanSecrets: fc
      .string({ minLength: 1, maxLength: 80 })
      .map((s) => `#!/bin/bash\necho 'scan'\n${s}`),
  }),
});

/**
 * Generates a base path string that is non-empty and safe for path.join.
 * Avoids null bytes and path traversal.
 */
const basePathArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => !s.includes("\0") && !s.includes("..") && s.trim().length > 0);

// --- Property 7: File writer maps all output fields to correct paths ---
// Feature: agent4-devsecops, Property 7: File writer maps all output fields to correct paths
// **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

describe("Feature: agent4-devsecops, Property 7: File writer maps all output fields to correct paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writeAll writes exactly 5 files with correct paths and verbatim content", async () => {
    const writer = new Agent4FileWriter();

    await fc.assert(
      fc.asyncProperty(validAgent4OutputArb, basePathArb, async (output, basePath) => {
        vi.clearAllMocks();

        await writer.writeAll(output, basePath);

        // Exactly 5 writeFile calls
        expect(mockedWriteFile).toHaveBeenCalledTimes(5);

        // Collect all writeFile calls as [path, content, encoding]
        const calls = mockedWriteFile.mock.calls.map((c) => ({
          path: c[0] as string,
          content: c[1] as string,
          encoding: c[2] as string,
        }));

        // Normalize path separators for cross-platform compatibility
        const normalize = (p: string) => p.replace(/\\/g, "/");

        // Expected mappings: [relativePath, expectedContent]
        const expectedMappings: [string, string][] = [
          ["Dockerfile", output.dockerfile],
          ["docker-compose.yml", output.dockerCompose],
          [".github/workflows/ci.yml", output.ciPipeline],
          [".kiro/hooks/validate-specs.sh", output.hooks.validateSpecs],
          [".kiro/hooks/scan-secrets.sh", output.hooks.scanSecrets],
        ];

        for (const [relativePath, expectedContent] of expectedMappings) {
          const matchingCall = calls.find((c) =>
            normalize(c.path).endsWith(normalize(relativePath)),
          );
          expect(matchingCall).toBeDefined();
          expect(matchingCall!.content).toBe(expectedContent);
          expect(matchingCall!.encoding).toBe("utf-8");
        }

        // All encodings are UTF-8
        for (const call of calls) {
          expect(call.encoding).toBe("utf-8");
        }
      }),
      { numRuns: 100 },
    );
  });

  it("writeAll sets executable permissions (0o755) on hook scripts only", async () => {
    const writer = new Agent4FileWriter();

    await fc.assert(
      fc.asyncProperty(validAgent4OutputArb, basePathArb, async (output, basePath) => {
        vi.clearAllMocks();

        await writer.writeAll(output, basePath);

        // chmod should be called exactly 2 times (for the two hooks)
        expect(mockedChmod).toHaveBeenCalledTimes(2);

        const normalize = (p: string) => p.replace(/\\/g, "/");
        const chmodCalls = mockedChmod.mock.calls.map((c) => ({
          path: normalize(c[0] as string),
          mode: c[1] as number,
        }));

        // Both hook scripts receive 0o755
        const validateSpecsCall = chmodCalls.find((c) =>
          c.path.endsWith(".kiro/hooks/validate-specs.sh"),
        );
        const scanSecretsCall = chmodCalls.find((c) =>
          c.path.endsWith(".kiro/hooks/scan-secrets.sh"),
        );

        expect(validateSpecsCall).toBeDefined();
        expect(validateSpecsCall!.mode).toBe(0o755);
        expect(scanSecretsCall).toBeDefined();
        expect(scanSecretsCall!.mode).toBe(0o755);
      }),
      { numRuns: 100 },
    );
  });

  it("writeAll creates directories recursively for every file", async () => {
    const writer = new Agent4FileWriter();

    await fc.assert(
      fc.asyncProperty(validAgent4OutputArb, basePathArb, async (output, basePath) => {
        vi.clearAllMocks();

        await writer.writeAll(output, basePath);

        // mkdir should be called 5 times (once per file mapping)
        expect(mockedMkdir).toHaveBeenCalledTimes(5);

        // All mkdir calls use { recursive: true }
        for (const call of mockedMkdir.mock.calls) {
          expect(call[1]).toEqual({ recursive: true });
        }
      }),
      { numRuns: 100 },
    );
  });
});

// --- Property 8: Filesystem errors wrapped with path and cause ---
// Feature: agent4-devsecops, Property 8: Filesystem errors wrapped with path and cause
// **Validates: Requirements 9.7, 12.5**

describe("Feature: agent4-devsecops, Property 8: Filesystem errors wrapped with path and cause", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writeFile failure throws FilesystemError with correct targetPath and cause", async () => {
    const writer = new Agent4FileWriter();

    await fc.assert(
      fc.asyncProperty(
        validAgent4OutputArb,
        basePathArb,
        fc.string({ minLength: 1, maxLength: 100 }),
        async (output, basePath, errorMessage) => {
          vi.clearAllMocks();

          const originalError = new Error(errorMessage);

          // Make the first writeFile call fail
          mockedWriteFile.mockRejectedValueOnce(originalError);

          try {
            await writer.writeAll(output, basePath);
            expect.fail("Expected FilesystemError to be thrown");
          } catch (error) {
            expect(error).toBeInstanceOf(FilesystemError);
            const fsError = error as FilesystemError;

            // The targetPath should contain the basePath component
            const normalize = (p: string) => p.replace(/\\/g, "/");
            const normalizedTarget = normalize(fsError.targetPath);

            // targetPath should end with one of the expected relative paths
            const expectedRelativePaths = [
              "Dockerfile",
              "docker-compose.yml",
              ".github/workflows/ci.yml",
              ".kiro/hooks/validate-specs.sh",
              ".kiro/hooks/scan-secrets.sh",
            ];
            const matchesExpectedPath = expectedRelativePaths.some((rp) =>
              normalizedTarget.endsWith(rp),
            );
            expect(matchesExpectedPath).toBe(true);

            // Cause is preserved
            expect(fsError.cause).toBe(originalError);
            expect(fsError.cause!.message).toBe(errorMessage);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("mkdir failure throws FilesystemError with correct targetPath and cause", async () => {
    const writer = new Agent4FileWriter();

    await fc.assert(
      fc.asyncProperty(
        validAgent4OutputArb,
        basePathArb,
        fc.string({ minLength: 1, maxLength: 100 }),
        async (output, basePath, errorMessage) => {
          vi.clearAllMocks();

          const originalError = new Error(errorMessage);

          // Make the first mkdir call fail
          mockedMkdir.mockRejectedValueOnce(originalError);

          try {
            await writer.writeAll(output, basePath);
            expect.fail("Expected FilesystemError to be thrown");
          } catch (error) {
            expect(error).toBeInstanceOf(FilesystemError);
            const fsError = error as FilesystemError;

            // targetPath should be a valid path ending with an expected file
            const normalize = (p: string) => p.replace(/\\/g, "/");
            const normalizedTarget = normalize(fsError.targetPath);
            const expectedRelativePaths = [
              "Dockerfile",
              "docker-compose.yml",
              ".github/workflows/ci.yml",
              ".kiro/hooks/validate-specs.sh",
              ".kiro/hooks/scan-secrets.sh",
            ];
            const matchesExpectedPath = expectedRelativePaths.some((rp) =>
              normalizedTarget.endsWith(rp),
            );
            expect(matchesExpectedPath).toBe(true);

            // Cause is preserved
            expect(fsError.cause).toBe(originalError);
            expect(fsError.cause!.message).toBe(errorMessage);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("chmod failure throws FilesystemError with correct targetPath and cause", async () => {
    const writer = new Agent4FileWriter();

    await fc.assert(
      fc.asyncProperty(
        validAgent4OutputArb,
        basePathArb,
        fc.string({ minLength: 1, maxLength: 100 }),
        async (output, basePath, errorMessage) => {
          vi.clearAllMocks();

          const originalError = new Error(errorMessage);

          // chmod is only called on hook scripts (the 4th and 5th files)
          // Make chmod fail on first call
          mockedChmod.mockRejectedValueOnce(originalError);

          try {
            await writer.writeAll(output, basePath);
            expect.fail("Expected FilesystemError to be thrown");
          } catch (error) {
            expect(error).toBeInstanceOf(FilesystemError);
            const fsError = error as FilesystemError;

            // targetPath should be a hook script path
            const normalize = (p: string) => p.replace(/\\/g, "/");
            const normalizedTarget = normalize(fsError.targetPath);
            const hookPaths = [
              ".kiro/hooks/validate-specs.sh",
              ".kiro/hooks/scan-secrets.sh",
            ];
            const matchesHookPath = hookPaths.some((rp) =>
              normalizedTarget.endsWith(rp),
            );
            expect(matchesHookPath).toBe(true);

            // Cause is preserved
            expect(fsError.cause).toBe(originalError);
            expect(fsError.cause!.message).toBe(errorMessage);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
