// src/infrastructure/mock-loader.ts — JSON mock file loader implementing MockLoaderPort
import { readFile } from "node:fs/promises";
import { Agent1Output } from "../domain/types";
import { Agent1OutputSchema } from "../domain/schemas";
import { MockLoaderPort } from "../application/generate-architecture-spec";
import { ValidationError, FilesystemError } from "../domain/errors";

const DEFAULT_MOCK_PATH = ".kiro/mocks/agent1.mock.json";

export class JsonMockLoader implements MockLoaderPort {
  constructor(private readonly mockPath: string = DEFAULT_MOCK_PATH) {}

  async load(): Promise<Agent1Output> {
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

    const result = Agent1OutputSchema.safeParse(parsed);
    if (!result.success) {
      const issue = result.error.issues[0]!;
      throw new ValidationError(
        issue.path.join("."),
        issue.message,
        undefined,
        "mock-loading",
      );
    }

    return result.data;
  }
}
