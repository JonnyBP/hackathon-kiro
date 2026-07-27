"use server";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Agent2OutputSchema } from "@/domain/schemas";
import type { z } from "zod";

export type Agent2Output = z.infer<typeof Agent2OutputSchema>;

export type GenerateResult =
  | { success: true; data: Agent2Output }
  | { success: false; error: string };

export async function generateSpec(): Promise<GenerateResult> {
  try {
    const mockPath = resolve(
      process.cwd(),
      ".kiro/mocks/agent2.mock-response.json",
    );
    const raw = await readFile(mockPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    const result = Agent2OutputSchema.parse(parsed);
    return { success: true, data: result };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    return { success: false, error: message };
  }
}
