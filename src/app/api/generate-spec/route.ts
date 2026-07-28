// src/app/api/generate-spec/route.ts — POST /api/generate-spec (Agent 2)
//
// Contract shared by the four endpoints (Requirement 21): Zod validation of the body
// first, mock resolution read on the server, per-endpoint timeout, output validated
// before answering 200, the 200/400/502/500 taxonomy through the shared serializer and
// no disk writes (NoOpFileWriter, design decision D10).

import { NextRequest, NextResponse } from "next/server";
import { GenerateArchitectureSpecUseCase } from "@/application/generate-architecture-spec";
import { VercelAiLlmClient } from "@/infrastructure/llm/vercel-ai-llm-client";
import { MockLlmClient } from "@/infrastructure/llm/mock-llm-client";
import { JsonMockLoader } from "@/infrastructure/mocks/mock-loader";
import { NoOpFileWriter } from "@/infrastructure/writers/no-op-file-writer";
import { ARCHITECT_SYSTEM_PROMPT } from "@/prompts/architect-agent";
import { SpecRequestSchema } from "@/domain/api-contracts";
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

const AGENT2_MOCK_RESPONSE_PATH = ".kiro/mocks/agent2.mock-response.json";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate the request body before anything else (R21.2, R21.3)
    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = SpecRequestSchema.safeParse(rawBody);
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
      ? new MockLlmClient(await readMockJson(AGENT2_MOCK_RESPONSE_PATH))
      : new VercelAiLlmClient();

    const useCase = new GenerateArchitectureSpecUseCase(
      llm,
      new JsonMockLoader(),
      new NoOpFileWriter(),
      ARCHITECT_SYSTEM_PROMPT,
    );

    // 3. Run with the endpoint timeout; expiry becomes a transient error → 502 (R21.12)
    // The use case validates the output against Agent2OutputSchema before returning,
    // so a 200 body always satisfies the agent contract (R21.6, R21.14).
    const result = await withEndpointTimeout(() =>
      useCase.execute({
        agent1Output: parsed.data.agent1Output,
        preferredStack: parsed.data.preferredStack,
      }),
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const { status, body } = serializeUnknownError(error);
    return NextResponse.json(body, { status });
  }
}
