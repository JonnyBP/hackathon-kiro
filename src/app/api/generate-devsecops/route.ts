// src/app/api/generate-devsecops/route.ts — POST /api/generate-devsecops (Agent 4)
//
// Reuses GenerateDevSecOpsSpecUseCase without duplicating its logic (R21.10) and injects
// NoOpFileWriter so the request never writes to the repository (R21.11, D10). The body is
// partial by design: missing Agent4Input fields are filled server-side by
// composeAgent4Input (decision D7).

import { NextRequest, NextResponse } from "next/server";
import { GenerateDevSecOpsSpecUseCase } from "@/application/generate-devsecops-spec";
import { SchemaObjectLlmClient } from "@/infrastructure/llm/schema-object-llm-client";
import { MockLlmClient } from "@/infrastructure/llm/mock-llm-client";
import { Agent4JsonMockLoader } from "@/infrastructure/mocks/agent4-mock-loader";
import { NoOpFileWriter } from "@/infrastructure/writers/no-op-file-writer";
import { DEVSECOPS_SYSTEM_PROMPT } from "@/prompts/devsecops-agent";
import { DevSecOpsRequestSchema } from "@/domain/api-contracts";
import { Agent4OutputSchema } from "@/domain/schemas";
import {
  AGENT4_INPUT_MOCK_PATH,
  AGENT4_OUTPUT_MOCK_PATH,
  composeAgent4Input,
} from "@/app/api/_shared/agent4-input-composer";
import {
  hasLlmCredential,
  isMockDataSource,
  readMockJson,
  withEndpointTimeout,
} from "@/app/api/_shared/endpoint-runtime";
import {
  missingConfigurationResponse,
  serializeRequestValidationError,
  serializeUnknownError,
} from "@/app/api/_shared/error-serializer";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate the request body before anything else (R21.2, R21.3)
    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = DevSecOpsRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      const { status, body } = serializeRequestValidationError(parsed.error);
      return NextResponse.json(body, { status });
    }

    // 2. Resolve the Fuente_Datos on the server (R21.7)
    const useMock = isMockDataSource();
    if (!useMock && !hasLlmCredential()) {
      const { status, body } = missingConfigurationResponse();
      return NextResponse.json(body, { status });
    }

    const llm = useMock
      ? new MockLlmClient(await readMockJson(AGENT4_OUTPUT_MOCK_PATH))
      : new SchemaObjectLlmClient(Agent4OutputSchema);

    // 3. Complete the partial input on the server (D7)
    const input = await composeAgent4Input(parsed.data);

    const useCase = new GenerateDevSecOpsSpecUseCase(
      llm,
      new Agent4JsonMockLoader(AGENT4_INPUT_MOCK_PATH),
      new NoOpFileWriter(),
      DEVSECOPS_SYSTEM_PROMPT,
    );

    // 4. Run with the endpoint timeout; expiry becomes a transient error → 502 (R21.12)
    // The use case validates the output against Agent4OutputSchema before returning,
    // so a 200 body always satisfies the agent contract (R21.6, R21.14).
    const result = await withEndpointTimeout(() => useCase.execute(input));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const { status, body } = serializeUnknownError(error);
    return NextResponse.json(body, { status });
  }
}
