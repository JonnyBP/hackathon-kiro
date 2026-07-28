// src/__tests__/generators/arb-compliance-report.ts — Arbitrary ComplianceReport with varying content
import fc from "fast-check";
import type {
  ComplianceReport,
  ComplianceDataType,
  ComplianceRegulation,
  ComplianceChecklistItem,
  ComplianceChecklistGroup,
} from "@/domain/compliance-report";

const arbDataType: fc.Arbitrary<ComplianceDataType> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  collected: fc.boolean(),
});

const arbRegulationStatus = fc.constantFrom(
  "mandatory" as const,
  "verification-required" as const,
  "recommended" as const,
  "not-applicable" as const,
);

const arbRegulation: fc.Arbitrary<ComplianceRegulation> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 80 }),
  status: arbRegulationStatus,
  reason: fc.string({ minLength: 1, maxLength: 300 }),
});

const arbChecklistItem: fc.Arbitrary<ComplianceChecklistItem> = fc.record({
  label: fc.string({ minLength: 1, maxLength: 200 }),
  checked: fc.boolean(),
});

const arbChecklistGroup: fc.Arbitrary<ComplianceChecklistGroup> = fc.record({
  category: fc.string({ minLength: 1, maxLength: 60 }),
  items: fc.array(arbChecklistItem, { minLength: 1, maxLength: 8 }),
});

export const arbComplianceReport: fc.Arbitrary<ComplianceReport> = fc.record({
  riskLevel: fc.constantFrom("low" as const, "medium" as const, "high" as const),
  dataTypes: fc.array(arbDataType, { minLength: 0, maxLength: 20 }),
  regulations: fc.array(arbRegulation, { minLength: 0, maxLength: 10 }),
  checklist: fc.array(arbChecklistGroup, { minLength: 0, maxLength: 5 }),
});

export { arbDataType, arbRegulation, arbChecklistItem, arbChecklistGroup };
