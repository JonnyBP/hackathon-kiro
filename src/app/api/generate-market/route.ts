// src/app/api/generate-market/route.ts — POST /api/generate-market (Agent 1)
//
// Same contract as the other three endpoints (Requirement 21). This use case produces a
// report and writes nothing, so no FileWriterPort is involved at all.

import { NextRequest, NextResponse } from "next/server";
import { GenerateMarketReportUseCase } from "@/application/generate-market-report";
import { SchemaObjectLlmClient } from "@/infrastructure/llm/schema-object-llm-client";
import { MockLlmClient } from "@/infrastructure/llm/mock-llm-client";
import { MarketReportJsonMockLoader } from "@/infrastructure/mocks/market-report-mock-loader";
import { MARKET_SYSTEM_PROMPT } from "@/prompts/market-agent";
import { MarketRequestSchema } from "@/domain/api-contracts";
import { MarketReportSchema } from "@/domain/market-report-schemas";
import {
  hasLlmCredential,
  isMockDataSource,
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
    const parsed = MarketRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      const { status, body } = serializeRequestValidationError(parsed.error);
      return NextResponse.json(body, { status });
    }

    // 2. Resolve the Fuente_Datos on the server (R21.7). In mock mode the report comes
    // from .kiro/mocks/agent1.market-report.mock.json and the LLM is never invoked.
    const useMock = isMockDataSource();
    if (!useMock && !hasLlmCredential()) {
      const { status, body } = missingConfigurationResponse();
      return NextResponse.json(body, { status });
    }

    const llm = useMock
      ? new MockLlmClient(undefined)
      : new SchemaObjectLlmClient(MarketReportSchema);

    const useCase = new GenerateMarketReportUseCase(
      llm,
      new MarketReportJsonMockLoader(),
      MARKET_SYSTEM_PROMPT,
    );

    // 3. Run with the endpoint timeout; expiry becomes a transient error → 502 (R21.12)
    // The use case validates the output against MarketReportSchema before returning,
    // so a 200 body always satisfies the agent contract (R21.6, R21.9, R21.14).
    const result = await withEndpointTimeout(() =>
      useCase.execute({
        brief: parsed.data.brief,
        regions: parsed.data.regions,
        constraints: parsed.data.constraints,
        useMock,
      }),
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const { status, body } = serializeUnknownError(error);
    return NextResponse.json(body, { status });
  }
}
