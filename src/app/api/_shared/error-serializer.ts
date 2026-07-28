// src/app/api/_shared/error-serializer.ts — Error serialization shared by the four handlers
//
// Nothing leaves the server except { error, category, operation } plus fieldPath on
// validation errors. `context`, `receivedValue`, `cause`, `stack` and every fragment of
// a system prompt are discarded here, before serialization (Requirement 21.5).

import { z } from "zod";
import { Agent2Error, ErrorCategory } from "@/domain/errors";

export type ErrorHttpStatus = 400 | 500 | 502;

/** The only shape any endpoint emits on error. */
export interface SerializedErrorBody {
  readonly error: string;
  readonly category?: ErrorCategory;
  readonly operation?: string;
  /** Path of the offending field, only for validation errors. */
  readonly fieldPath?: string;
}

export interface SerializedErrorResponse {
  readonly status: ErrorHttpStatus;
  readonly body: SerializedErrorBody;
}

/**
 * Fixed message catalogue. Messages are declared here and never derived from provider
 * output, so no key, environment variable name, prompt fragment or user text can leak.
 */
export const ENDPOINT_ERROR_MESSAGES = {
  requestValidation:
    "Los datos enviados están incompletos o no tienen el formato esperado",
  outputValidation: "No pudimos interpretar la respuesta del agente",
  transient: "El agente no respondió a tiempo. Intenta de nuevo.",
  permanent: "No pudimos completar la generación en este momento.",
  missingConfiguration: "Configuración del servicio incompleta",
  unexpected: "Error interno del servidor",
} as const;

/** VALIDATION → 400, LLM_TRANSIENT → 502, LLM_PERMANENT and FILESYSTEM → 500. */
export function statusForCategory(category: ErrorCategory): ErrorHttpStatus {
  switch (category) {
    case "VALIDATION":
      return 400;
    case "LLM_TRANSIENT":
      return 502;
    case "LLM_PERMANENT":
    case "FILESYSTEM":
      return 500;
  }
}

function messageForError(error: Agent2Error): string {
  switch (error.category) {
    case "VALIDATION":
      return error.operation === "output-validation"
        ? ENDPOINT_ERROR_MESSAGES.outputValidation
        : ENDPOINT_ERROR_MESSAGES.requestValidation;
    case "LLM_TRANSIENT":
      return ENDPOINT_ERROR_MESSAGES.transient;
    case "LLM_PERMANENT":
    case "FILESYSTEM":
      return ENDPOINT_ERROR_MESSAGES.permanent;
  }
}

/** Serializes a typed domain error, discarding every internal detail. */
export function serializeAgent2Error(
  error: Agent2Error,
): SerializedErrorResponse {
  const body: SerializedErrorBody = {
    error: messageForError(error),
    category: error.category,
    operation: error.operation,
    ...(error.category === "VALIDATION" && typeof error.context.fieldPath === "string"
      ? { fieldPath: error.context.fieldPath }
      : {}),
  };

  return { status: statusForCategory(error.category), body };
}

/** Serializes a request-body Zod failure as a 400 without invoking the LLM. */
export function serializeRequestValidationError(
  zodError: z.ZodError,
  operation = "request-validation",
): SerializedErrorResponse {
  const firstIssue = zodError.issues[0];
  return {
    status: 400,
    body: {
      error: ENDPOINT_ERROR_MESSAGES.requestValidation,
      category: "VALIDATION",
      operation,
      fieldPath: firstIssue ? firstIssue.path.join(".") : "",
    },
  };
}

/** 500 when the LLM credential is missing outside mock mode, without naming it (R21.8). */
export function missingConfigurationResponse(): SerializedErrorResponse {
  return {
    status: 500,
    body: { error: ENDPOINT_ERROR_MESSAGES.missingConfiguration },
  };
}

/** Total mapping: every thrown value becomes exactly one of 400, 502 or 500. */
export function serializeUnknownError(error: unknown): SerializedErrorResponse {
  if (error instanceof Agent2Error) {
    return serializeAgent2Error(error);
  }
  return {
    status: 500,
    body: { error: ENDPOINT_ERROR_MESSAGES.unexpected },
  };
}
