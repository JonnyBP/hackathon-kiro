// src/application/view/selectors/compliance-view.ts — Compliance section view selector (pure TS, no React)

import type {
  ComplianceReport,
  ComplianceDataType,
  ComplianceRegulation,
  ComplianceChecklistGroup,
} from "@/domain/compliance-report";

export interface ComplianceDataTypeView {
  name: string;
  collected: boolean;
}

export interface ComplianceRegulationView {
  name: string;
  status: string;
  reason: string;
}

export interface RegulationGroupView {
  level: string;
  regulations: ComplianceRegulationView[];
}

export interface ComplianceChecklistItemView {
  label: string;
  checked: boolean;
}

export interface ComplianceChecklistGroupView {
  category: string;
  items: ComplianceChecklistItemView[];
}

export interface ComplianceViewResult {
  riskLevel: { level: string; label: string };
  dataTypes: ComplianceDataTypeView[];
  dataTypesOmitidos: number;
  regulaciones: RegulationGroupView[];
  checklist: ComplianceChecklistGroupView[];
}

const RISK_LABEL_ES: Record<string, string> = {
  low: "baja",
  medium: "media",
  high: "alta",
};

const CATEGORY_TRANSLATION: Record<string, string> = {
  "Legal Documents": "Documentos Legales",
  "Open-Source Licenses": "Licencias Open Source",
  "Privacy Controls": "Controles de Privacidad",
  "AWS/AI Compliance": "Compliance AWS/IA",
  "Children": "Menores",
  "Payments": "Pagos",
  "International Transfers": "Transferencias Internacionales",
};

const REGULATION_LEVEL_ORDER: string[] = [
  "mandatory",
  "verification-required",
  "recommended",
  "not-applicable",
];

export function calcularVistaDeCompliance(report: ComplianceReport): ComplianceViewResult {
  // Risk level
  const riskLevel = {
    level: report.riskLevel,
    label: RISK_LABEL_ES[report.riskLevel] ?? report.riskLevel,
  };

  // Data types sliced to 20
  const allDataTypes = report.dataTypes ?? [];
  const dataTypes: ComplianceDataTypeView[] = allDataTypes.slice(0, 20).map((dt: ComplianceDataType) => ({
    name: dt.name,
    collected: dt.collected,
  }));
  const dataTypesOmitidos = Math.max(0, allDataTypes.length - 20);

  // Regulations grouped by level in order
  const regByLevel = new Map<string, ComplianceRegulationView[]>();
  for (const reg of report.regulations ?? []) {
    const status = reg.status;
    if (!regByLevel.has(status)) {
      regByLevel.set(status, []);
    }
    regByLevel.get(status)!.push({
      name: reg.name,
      status: reg.status,
      reason: reg.reason,
    });
  }

  const regulaciones: RegulationGroupView[] = [];
  // Known levels in order
  for (const level of REGULATION_LEVEL_ORDER) {
    const items = regByLevel.get(level);
    if (items && items.length > 0) {
      regulaciones.push({ level, regulations: items });
      regByLevel.delete(level);
    }
  }
  // Unknown levels at end
  for (const [level, items] of regByLevel) {
    if (items.length > 0) {
      regulaciones.push({ level, regulations: items });
    }
  }

  // Checklist with translated categories, omit groups with no items
  const checklist: ComplianceChecklistGroupView[] = [];
  for (const group of report.checklist ?? []) {
    if (!group.items || group.items.length === 0) continue;
    const translatedCategory = CATEGORY_TRANSLATION[group.category] ?? group.category;
    checklist.push({
      category: translatedCategory,
      items: group.items.map((item) => ({
        label: item.label,
        checked: item.checked,
      })),
    });
  }

  return {
    riskLevel,
    dataTypes,
    dataTypesOmitidos,
    regulaciones,
    checklist,
  };
}
