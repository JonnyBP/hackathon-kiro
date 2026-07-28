// src/__tests__/integration/agent4-pipeline.test.ts — Integration tests for Agent 4 DevSecOps pipeline
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GenerateDevSecOpsSpecUseCase,
  type LlmPort,
  type Agent4MockLoaderPort,
  type Agent4FileWriterPort,
} from "@/application/generate-devsecops-spec";
import type { Agent4Input, Agent4Output } from "@/domain/types";
import {
  ValidationError,
  LlmError,
  FilesystemError,
} from "@/domain/errors";

// --- Test fixtures ---

const validInput: Agent4Input = {
  projectName: "TestProject",
  stack: ["TypeScript", "Node.js", "Vitest"],
  architecturePattern: "Clean",
  securityPolicies: [
    {
      name: "ZodValidation",
      description: "Input validation",
      enforcement: "Middleware",
    },
  ],
  taskList: [
    {
      id: "t1",
      title: "Setup",
      description: "Initial setup task",
      dependencies: [],
    },
  ],
  complianceReport: {
    licenseSummary: [{ package: "express", license: "MIT" }],
    regulatoryFlags: [],
  },
};

const knownGoodOutput: Agent4Output = {
  dockerfile:
    "# Stage 1: Dependencies\nFROM node:20-alpine AS deps\nWORKDIR /app\nCOPY package.json package-lock.json ./\nRUN npm ci --production=false\n\n# Stage 2: Build\nFROM node:20-alpine AS build\nWORKDIR /app\nCOPY --from=deps /app/node_modules ./node_modules\nCOPY . .\nRUN npm run build\nRUN npm prune --production\n\n# Stage 3: Runtime\nFROM node:20-alpine AS runtime\nWORKDIR /app\nENV NODE_ENV=production\nRUN addgroup -S appgroup && adduser -S appuser -u 1001 -G appgroup\nCOPY --from=build /app/dist ./dist\nCOPY --from=build /app/node_modules ./node_modules\nCOPY --from=build /app/package.json ./package.json\nUSER appuser\nEXPOSE 3000\nHEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1\nCMD [\"node\", \"dist/index.js\"]",
  dockerCompose:
    "version: '3.8'\n\nservices:\n  app:\n    build:\n      context: .\n      dockerfile: Dockerfile\n    ports:\n      - '3000:3000'\n    environment:\n      - NODE_ENV=production\n      - DATABASE_URL=postgresql://postgres:postgres@db:5432/app\n    depends_on:\n      db:\n        condition: service_healthy\n    networks:\n      - frontend\n      - backend\n    volumes:\n      - .:/app\n      - /app/node_modules\n\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_USER: postgres\n      POSTGRES_PASSWORD: postgres\n      POSTGRES_DB: app\n    ports:\n      - '5432:5432'\n    volumes:\n      - db_data:/var/lib/postgresql/data\n    networks:\n      - backend\n    healthcheck:\n      test: ['CMD-SHELL', 'pg_isready -U postgres']\n      interval: 10s\n      timeout: 5s\n      retries: 5\n\nvolumes:\n  db_data:\n    driver: local\n\nnetworks:\n  frontend:\n    driver: bridge\n  backend:\n    driver: bridge",
  ciPipeline:
    "name: CI/CD\n\non:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\n\njobs:\n  lint:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm run lint\n\n  typecheck:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm run typecheck\n\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm run test -- --run\n\n  security:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm audit --audit-level=high\n\n  license-check:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npx license-checker --onlyAllow 'MIT;ISC;Apache-2.0;BSD-2-Clause;BSD-3-Clause'\n\n  build:\n    runs-on: ubuntu-latest\n    needs: [lint, typecheck, test]\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm run build\n\n  deploy:\n    runs-on: ubuntu-latest\n    needs: [build, security]\n    if: github.ref == 'refs/heads/main' && github.event_name == 'push'\n    steps:\n      - uses: actions/checkout@v4\n      - run: echo 'Deploying to production...'",
  hooks: {
    validateSpecs:
      '#!/bin/bash\nset -euo pipefail\n\n# validate-specs.sh - Validates spec file consistency\n\nERRORS=0\n\nREQUIRED_FILES=(\n  ".kiro/steering/product.md"\n  ".kiro/steering/tech.md"\n  ".kiro/specs/requirements.md"\n)\n\nfor file in "${REQUIRED_FILES[@]}"; do\n  if [ ! -f "$file" ]; then\n    echo "ERROR: Missing required file: $file" >&2\n    ERRORS=$((ERRORS + 1))\n  fi\ndone\n\nif [ -f ".kiro/specs/requirements.md" ]; then\n  while IFS= read -r line; do\n    if echo "$line" | grep -qiE \'(WHEN|WHILE|WHERE|IF|THE|SHALL)\'; then\n      if ! echo "$line" | grep -q \'SHALL\'; then\n        echo "ERROR: Requirement missing SHALL keyword" >&2\n        ERRORS=$((ERRORS + 1))\n      fi\n    fi\n  done < .kiro/specs/requirements.md\nfi\n\nif [ $ERRORS -gt 0 ]; then\n  echo "Validation failed with $ERRORS error(s)" >&2\n  exit 1\nfi\n\nexit 0',
    scanSecrets:
      '#!/bin/bash\nset -euo pipefail\n\n# scan-secrets.sh - Scans staged files for accidentally committed secrets\n\nFOUND_SECRETS=0\n\nSTAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || echo "")\n\nif [ -z "$STAGED_FILES" ]; then\n  exit 0\nfi\n\ndeclare -a PATTERNS=(\n  \'AKIA[0-9A-Z]{16}:AWS Access Key\'\n  \'-----BEGIN (RSA|SSH|PGP) PRIVATE KEY-----:Private Key\'\n)\n\nfor file in $STAGED_FILES; do\n  [ -f "$file" ] || continue\n  for pattern_entry in "${PATTERNS[@]}"; do\n    PATTERN="${pattern_entry%%:*}"\n    PATTERN_NAME="${pattern_entry##*:}"\n    if grep -qE "$PATTERN" "$file" 2>/dev/null; then\n      echo "$file: $PATTERN_NAME" >&2\n      FOUND_SECRETS=$((FOUND_SECRETS + 1))\n    fi\n  done\ndone\n\nif [ $FOUND_SECRETS -gt 0 ]; then\n  echo "Blocked: $FOUND_SECRETS potential secret(s) found" >&2\n  exit 1\nfi\n\nexit 0',
  },
};

// --- Mock implementations ---

class MockLlm implements LlmPort {
  constructor(private readonly response: unknown) {}
  async invoke(_systemPrompt: string, _userPrompt: string): Promise<unknown> {
    return this.response;
  }
}

class FailingLlm implements LlmPort {
  constructor(private readonly error: Error) {}
  async invoke(_systemPrompt: string, _userPrompt: string): Promise<unknown> {
    throw this.error;
  }
}

class MockFileWriter implements Agent4FileWriterPort {
  public writtenOutput: Agent4Output | null = null;
  public writtenBasePath: string | null = null;

  async writeAll(output: Agent4Output, basePath: string): Promise<void> {
    this.writtenOutput = output;
    this.writtenBasePath = basePath;
  }
}

class FailingFileWriter implements Agent4FileWriterPort {
  async writeAll(_output: Agent4Output, _basePath: string): Promise<void> {
    throw new Error("EACCES: permission denied");
  }
}

class MockLoader implements Agent4MockLoaderPort {
  public loadCalled = false;
  constructor(private readonly input: Agent4Input) {}

  async load(): Promise<Agent4Input> {
    this.loadCalled = true;
    return this.input;
  }
}

// --- Tests ---

describe("Integration: Agent 4 DevSecOps Pipeline", () => {
  const systemPrompt = "You are a DevSecOps agent.";
  let mockFileWriter: MockFileWriter;
  let mockLoader: MockLoader;

  beforeEach(() => {
    mockFileWriter = new MockFileWriter();
    mockLoader = new MockLoader(validInput);
  });

  describe("Full pipeline success", () => {
    it("should produce validated output when LLM returns known-good output", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);

      expect(result).toEqual(knownGoodOutput);
      expect(mockFileWriter.writtenOutput).toEqual(knownGoodOutput);
      expect(mockFileWriter.writtenBasePath).toBe(".");
    });
  });

  describe("Dockerfile content verification", () => {
    it("should contain multi-stage build with 2+ FROM directives", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);
      const fromCount = (result.dockerfile.match(/FROM/g) || []).length;

      expect(fromCount).toBeGreaterThanOrEqual(2);
    });

    it("should use Alpine base image", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);

      expect(result.dockerfile).toContain("node:20-alpine");
    });

    it("should configure non-root user with UID 1001", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);

      expect(result.dockerfile).toContain("USER appuser");
      expect(result.dockerfile).toContain("1001");
    });

    it("should include HEALTHCHECK instruction with interval", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);

      expect(result.dockerfile).toContain("HEALTHCHECK");
      expect(result.dockerfile).toContain("--interval=30s");
    });
  });

  describe("Docker Compose content verification", () => {
    it("should contain services section with app and db", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);

      expect(result.dockerCompose).toContain("services:");
      expect(result.dockerCompose).toContain("app:");
      expect(result.dockerCompose).toContain("db:");
    });

    it("should define frontend and backend networks", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);

      expect(result.dockerCompose).toContain("networks:");
      expect(result.dockerCompose).toContain("frontend:");
      expect(result.dockerCompose).toContain("backend:");
    });

    it("should define volumes with db_data", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);

      expect(result.dockerCompose).toContain("volumes:");
      expect(result.dockerCompose).toContain("db_data:");
    });
  });

  describe("CI Pipeline content verification", () => {
    it("should contain jobs section", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);

      expect(result.ciPipeline).toContain("jobs:");
    });

    it("should contain all required job stages", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);
      const requiredJobs = [
        "lint:",
        "typecheck:",
        "test:",
        "security:",
        "license-check:",
        "build:",
        "deploy:",
      ];

      for (const job of requiredJobs) {
        expect(result.ciPipeline).toContain(job);
      }
    });

    it("should have correct dependency chain for build and deploy", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);

      expect(result.ciPipeline).toContain("needs: [lint, typecheck, test]");
      expect(result.ciPipeline).toContain("needs: [build, security]");
    });

    it("should have deploy conditional for main branch", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);

      expect(result.ciPipeline).toContain(
        "github.ref == 'refs/heads/main'",
      );
    });
  });

  describe("Hook scripts verification", () => {
    it("should start validateSpecs with shebang", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);

      expect(result.hooks.validateSpecs).toMatch(/^#!\/bin\/bash/);
    });

    it("should start scanSecrets with shebang", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);

      expect(result.hooks.scanSecrets).toMatch(/^#!\/bin\/bash/);
    });

    it("should contain file existence checks in validateSpecs", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);

      expect(result.hooks.validateSpecs).toContain("! -f");
      expect(result.hooks.validateSpecs).toContain("REQUIRED_FILES");
    });

    it("should contain EARS keyword validation in validateSpecs", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);

      expect(result.hooks.validateSpecs).toContain("SHALL");
    });

    it("should contain secret pattern detection in scanSecrets", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute(validInput);

      expect(result.hooks.scanSecrets).toContain("AKIA");
      expect(result.hooks.scanSecrets).toContain("PRIVATE KEY");
    });
  });

  describe("Mock loader fallback path", () => {
    it("should call mock loader when no input is provided", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const result = await useCase.execute();

      expect(mockLoader.loadCalled).toBe(true);
      expect(result).toEqual(knownGoodOutput);
    });
  });

  describe("Error scenarios", () => {
    it("should throw ValidationError for invalid input", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      const invalidInput = {
        projectName: "",
        stack: [],
        architecturePattern: "",
        securityPolicies: [],
        taskList: [],
        complianceReport: {
          licenseSummary: [],
          regulatoryFlags: [],
        },
      } as unknown as Agent4Input;

      await expect(useCase.execute(invalidInput)).rejects.toThrow(
        ValidationError,
      );

      try {
        await useCase.execute(invalidInput);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.category).toBe("VALIDATION");
        expect(validationError.operation).toBe("input-validation");
      }
    });

    it("should throw LlmError when LLM fails with transient error", async () => {
      const llm = new FailingLlm(new Error("timeout: connection reset"));
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      await expect(useCase.execute(validInput)).rejects.toThrow(LlmError);

      try {
        await useCase.execute(validInput);
      } catch (error) {
        expect(error).toBeInstanceOf(LlmError);
        const llmError = error as LlmError;
        expect(llmError.isTransient).toBe(true);
        expect(llmError.category).toBe("LLM_TRANSIENT");
        expect(llmError.operation).toBe("llm-invocation");
      }
    });

    it("should throw LlmError with permanent classification for non-transient errors", async () => {
      const llm = new FailingLlm(new Error("invalid API key"));
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        mockFileWriter,
        systemPrompt,
      );

      await expect(useCase.execute(validInput)).rejects.toThrow(LlmError);

      try {
        await useCase.execute(validInput);
      } catch (error) {
        expect(error).toBeInstanceOf(LlmError);
        const llmError = error as LlmError;
        expect(llmError.isTransient).toBe(false);
        expect(llmError.category).toBe("LLM_PERMANENT");
      }
    });

    it("should throw FilesystemError when file writer fails", async () => {
      const llm = new MockLlm(knownGoodOutput);
      const failingWriter = new FailingFileWriter();
      const useCase = new GenerateDevSecOpsSpecUseCase(
        llm,
        mockLoader,
        failingWriter,
        systemPrompt,
      );

      await expect(useCase.execute(validInput)).rejects.toThrow(
        FilesystemError,
      );

      try {
        await useCase.execute(validInput);
      } catch (error) {
        expect(error).toBeInstanceOf(FilesystemError);
        const fsError = error as FilesystemError;
        expect(fsError.category).toBe("FILESYSTEM");
        expect(fsError.operation).toBe("file-write");
      }
    });
  });
});
