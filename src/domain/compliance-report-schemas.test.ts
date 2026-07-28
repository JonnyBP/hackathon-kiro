// Unit tests for ComplianceReportSchema (Requirement 21.9)
import { describe, it, expect } from "vitest";
import { ComplianceReportSchema } from "@/domain/compliance-report-schemas";

function validComplianceReport() {
  return {
    riskLevel: "medium" as const,
    dataTypes: [
      { name: "Email", collected: false },
      { name: "Idea text", collected: true },
    ],
    regulations: [
      { name: "GDPR", status: "verification-required" as const, reason: "EU scope unknown" },
      { name: "Licenses", status: "mandatory" as const, reason: "Ships dependencies" },
      { name: "ePrivacy", status: "recommended" as const, reason: "Functional storage only" },
      { name: "COPPA", status: "not-applicable" as const, reason: "Not child-directed" },
    ],
    checklist: [
      {
        category: "Legal Documents",
        items: [{ label: "Publish a privacy notice", checked: false }],
      },
      {
        category: "Open-Source Licenses",
        items: [{ label: "Run the license check in CI", checked: true }],
      },
    ],
  };
}

describe("ComplianceReportSchema", () => {
  it("accepts a complete valid report", () => {
    expect(
      ComplianceReportSchema.safeParse(validComplianceReport()).success,
    ).toBe(true);
  });

  it("accepts all four regulation statuses", () => {
    const statuses = [
      "mandatory",
      "verification-required",
      "recommended",
      "not-applicable",
    ];

    for (const status of statuses) {
      const report = validComplianceReport();
      report.regulations = [
        { name: "R", status: status as "mandatory", reason: "because" },
      ];
      expect(ComplianceReportSchema.safeParse(report).success).toBe(true);
    }
  });

  it("accepts an empty dataTypes list", () => {
    const report = validComplianceReport();
    report.dataTypes = [];

    expect(ComplianceReportSchema.safeParse(report).success).toBe(true);
  });

  it("discards unknown extra fields without invalidating the report", () => {
    const withExtras = {
      ...validComplianceReport(),
      disclaimer: "not legal advice",
      regulations: [
        {
          name: "GDPR",
          status: "mandatory" as const,
          reason: "EU users",
          jurisdiction: "EU",
        },
      ],
    };

    const result = ComplianceReportSchema.safeParse(withExtras);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).not.toHaveProperty("disclaimer");
    expect(result.data.regulations[0]).not.toHaveProperty("jurisdiction");
  });

  it("rejects a risk level outside the three-level scale", () => {
    const report = { ...validComplianceReport(), riskLevel: "critical" };

    expect(ComplianceReportSchema.safeParse(report).success).toBe(false);
  });

  it("rejects a regulation status outside the four-level scale", () => {
    const report = validComplianceReport();
    (report.regulations[0] as { status: string }).status = "maybe";

    expect(ComplianceReportSchema.safeParse(report).success).toBe(false);
  });

  it("rejects a non-boolean collected flag", () => {
    const report = validComplianceReport();
    (report.dataTypes[0] as { collected: unknown }).collected = "yes";

    expect(ComplianceReportSchema.safeParse(report).success).toBe(false);
  });

  it("rejects an empty regulations list", () => {
    const report = validComplianceReport();
    report.regulations = [];

    expect(ComplianceReportSchema.safeParse(report).success).toBe(false);
  });

  it("rejects a checklist group without items", () => {
    const report = validComplianceReport();
    report.checklist = [{ category: "Legal Documents", items: [] }];

    expect(ComplianceReportSchema.safeParse(report).success).toBe(false);
  });
});
