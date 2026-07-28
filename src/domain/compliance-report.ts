// src/domain/compliance-report.ts — TypeScript interfaces for Compliance Report

export interface ComplianceDataType {
  name: string;
  collected: boolean;
}

export interface ComplianceRegulation {
  name: string;
  status: "mandatory" | "verification-required" | "recommended" | "not-applicable";
  reason: string;
}

export interface ComplianceChecklistItem {
  label: string;
  checked: boolean;
}

export interface ComplianceChecklistGroup {
  category: string;
  items: ComplianceChecklistItem[];
}

export interface ComplianceReport {
  riskLevel: "low" | "medium" | "high";
  dataTypes: ComplianceDataType[];
  regulations: ComplianceRegulation[];
  checklist: ComplianceChecklistGroup[];
}
