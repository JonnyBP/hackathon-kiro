// src/infrastructure/mocks/agent4-mock-loader.ts — JSON mock file loader for Agent 4 input
import { readFile } from "node:fs/promises";
import { Agent4Input } from "@/domain/types";
import { Agent4InputSchema } from "@/domain/schemas";
import { Agent4MockLoaderPort } from "@/application/generate-devsecops-spec";
import { ValidationError, FilesystemError } from "@/domain/errors";

const DEFAULT_MOCK_PATH = ".kiro/mocks/agent4.mock.json";

export class Agent4JsonMockLoader implements Agent4MockLoaderPort {
  constructor(private readonly mockPath: string = DEFAULT_MOCK_PATH) {}

  async load(): Promise<Agent4Input> {
    let raw: string;
    try {
      raw = await readFile(this.mockPath, "utf-8");
    } catch (error) {
      throw new FilesystemError(
        this.mockPath,
        "mock-loading",
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new ValidationError(
        "",
        "valid JSON",
        raw.slice(0, 100),
        "mock-loading",
      );
    }

    const result = Agent4InputSchema.safeParse(parsed);
    if (!result.success) {
      const issue = result.error.issues[0]!;
      throw new ValidationError(
        issue.path.join("."),
        issue.message,
        undefined,
        "mock-loading",
      );
    }

    return result.data as unknown as Agent4Input;
  }
}
