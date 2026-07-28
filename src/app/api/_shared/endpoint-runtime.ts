// src/app/api/_shared/endpoint-runtime.ts — Server-side runtime helpers for the four handlers
//
// Data source resolution, credential presence and the per-endpoint timeout. Everything
// here runs in the Node process of the route handler: no value is ever exposed to the
// client and no variable uses the NEXT_PUBLIC_ prefix (Requirement 21.5, 21.8).

import { readFile } from "node:fs/promises";
import { FilesystemError, LlmError, ValidationError } from "@/domain/errors";

/** Env var that declares the Fuente_Datos. Set to "mock" to resolve from .kiro/mocks. */
export const DATA_SOURCE_ENV_VAR = "KIROSPEC_DATA_SOURCE";

/** Env var holding the LLM provider credential, read by the AI SDK. */
export const LLM_CREDENTIAL_ENV_VAR = "OPENAI_API_KEY";

/** Coherent with the 120 s per Fuente_Sección of assumption 4 (Requirement 21.12). */
export const ENDPOINT_TIMEOUT_MS = 120_000;

/** True when the configured Fuente_Datos is the mock files (Requirement 21.7). */
export function isMockDataSource(): boolean {
  const value = process.env[DATA_SOURCE_ENV_VAR]?.trim().toLowerCase();
  return value === "mock" || value === "mocks";
}

/** True when the LLM provider credential is present and non-empty. */
export function hasLlmCredential(): boolean {
  const value = process.env[LLM_CREDENTIAL_ENV_VAR];
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Races the operation against the endpoint timeout. On expiry the rejection is a
 * transient LlmError, which the serializer maps to 502 (Requirement 21.12).
 */
export async function withEndpointTimeout<T>(
  operation: () => Promise<T>,
  operationName = "llm-invocation",
  timeoutMs: number = ENDPOINT_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new LlmError(
          "Endpoint timeout reached",
          true,
          operationName,
          { timeoutMs },
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(), timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Reads a mock JSON file from disk on the server. Used to feed MockLlmClient for the
 * agents whose mock is an LLM response rather than a report (Agents 2 and 4).
 */
export async function readMockJson(path: string): Promise<unknown> {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch (error) {
    throw new FilesystemError(
      path,
      "mock-loading",
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new ValidationError(
      "",
      "valid JSON",
      undefined,
      "mock-loading",
    );
  }
}
