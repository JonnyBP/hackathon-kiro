// src/infrastructure/mocks/market-report-mock-loader.ts — Agent 1 market report mock loader
//
// Read on the SERVER with node:fs only, never imported statically from a component,
// so the mock never reaches the client bundle (Requirement 16.1).
import { readFile } from "node:fs/promises";
import { MarketReport } from "@/domain/market-report";
import { MarketReportSchema } from "@/domain/market-report-schemas";
import { MarketReportMockLoaderPort } from "@/application/generate-market-report";
import { ValidationError, FilesystemError } from "@/domain/errors";

const DEFAULT_MOCK_PATH = ".kiro/mocks/agent1.market-report.mock.json";

export class MarketReportJsonMockLoader implements MarketReportMockLoaderPort {
  constructor(private readonly mockPath: string = DEFAULT_MOCK_PATH) {}

  async load(): Promise<MarketReport> {
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
    } catch {
      throw new ValidationError(
        "",
        "valid JSON",
        raw.slice(0, 100),
        "mock-loading",
      );
    }

    const result = MarketReportSchema.safeParse(parsed);
    if (!result.success) {
      const issue = result.error.issues[0]!;
      throw new ValidationError(
        issue.path.join("."),
        issue.message,
        undefined,
        "mock-loading",
      );
    }

    return result.data as MarketReport;
  }
}
