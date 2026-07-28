// src/domain/compliance-report-schemas.ts — Zod schema for Compliance Report
import { z } from "zod";

const ComplianceDataTypeSchema = z.object({
  name: z.string(),
  collected: z.boolean(),
});

const ComplianceRegulationSchema = z.object({
  name: z.string(),
  status: z.enum(["mandatory", "verification-required", "recommended", "not-applicable"]),
  reason: z.string(),
});

const ComplianceChecklistItemSchema = z.object({
  label: z.string(),
  checked: z.boolean(),
});

const ComplianceChecklistGroupSchema = z.object({
  category: z.string(),
  items: z.array(ComplianceChecklistItemSchema),
});

export const ComplianceReportSchema = z.object({
  riskLevel: z.enum(["low", "medium", "high"]),
  dataTypes: z.array(ComplianceDataTypeSchema),
  regulations: z.array(ComplianceRegulationSchema).min(1),
  checklist: z.array(ComplianceChecklistGroupSchema.extend({
    items: z.array(ComplianceChecklistItemSchema).min(1),
  })),
});

export type ComplianceReportParsed = z.infer<typeof ComplianceReportSchema>;
