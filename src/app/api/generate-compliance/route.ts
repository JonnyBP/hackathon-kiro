// src/app/api/generate-compliance/route.ts — POST /api/generate-compliance (Agent 3)
//
// Same contract as the other three endpoints (Requirement 21). This use case produces a
// report and writes nothing, so no FileWriterPort is involved at all.

import { NextRequest, NextResponse } from "next/server";
import { GenerateComplianceReportUseCase } from "@/application/generate-compliance-report";
import { SchemaObjectLlmClient } from "@/infrastructure/llm/schema-object-llm-client";
import { MockLlmClient } from "@/infrastructure/llm/mock-llm-client";
import { ComplianceReportJsonMockLoader } from "@/infrastructure/mocks/compliance-mock-loader";
import { COMPLIANCE_SYSTEM_PROMPT } from "@/prompts/compliance-agent";
import { ComplianceRequestSchema } from "@/domain/api-contracts";
import { ComplianceReportSchema } from "@/domain/compliance-report-schemas";
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
    const parsed = ComplianceRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      const { status, body } = serializeRequestValidationError(parsed.error);
      return NextResponse.json(body, { status });
    }

    // 2. Resolve the Fuente_Datos on the server (R21.7). In mock mode the report comes
    // from .kiro/mocks/agent3.mock.json and the LLM is never invoked.
    const useMock = isMockDataSource();
    if (!useMock && !hasLlmCredential()) {
      const { status, body } = missingConfigurationResponse();
      return NextResponse.json(body, { status });
    }

    const llm = useMock
      ? new MockLlmClient(undefined)
      : new SchemaObjectLlmClient(ComplianceReportSchema);

    const useCase = new GenerateComplianceReportUseCase(
      llm,
      new ComplianceReportJsonMockLoader(),
      COMPLIANCE_SYSTEM_PROMPT,
    );

    // 3. Run with the endpoint timeout; expiry becomes a transient error → 502 (R21.12)
    // The use case validates the output against ComplianceReportSchema before returning,
    // so a 200 body always satisfies the agent contract (R21.6, R21.9, R21.14).
    const result = await withEndpointTimeout(() =>
      useCase.execute({
        brief: parsed.data.brief,
        techSteering: parsed.data.techSteering,
        regions: parsed.data.regions,
        useMock,
      }),
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const { status, body } = serializeUnknownError(error);
    return NextResponse.json(body, { status });
  }
}
