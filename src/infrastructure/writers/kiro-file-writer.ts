// src/infrastructure/writers/kiro-file-writer.ts — Filesystem writer implementing FileWriterPort
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  Agent2Output,
  TechSteering,
  DesignOutput,
  TaskItem,
} from "@/domain/types";
import { FileWriterPort } from "@/application/generate-architecture-spec";
import { FilesystemError } from "@/domain/errors";

interface FileMapping {
  relativePath: string;
  content: string;
}

export class KiroFileWriter implements FileWriterPort {
  async writeAll(output: Agent2Output, basePath: string): Promise<void> {
    const mappings = this.buildFileMappings(output);

    for (const mapping of mappings) {
      const fullPath = join(basePath, mapping.relativePath);
      const dir = dirname(fullPath);
      try {
        await mkdir(dir, { recursive: true });
        await writeFile(fullPath, mapping.content, "utf-8");
      } catch (error) {
        throw new FilesystemError(
          fullPath,
          "file-write",
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
  }

  private buildFileMappings(output: Agent2Output): FileMapping[] {
    return [
      {
        relativePath: "steering/tech.md",
        content: this.formatTechSteering(output.techSteering),
      },
      {
        relativePath: "specs/requirements.md",
        content: output.requirements,
      },
      {
        relativePath: "specs/design.md",
        content: this.formatDesign(output.design),
      },
      {
        relativePath: "specs/tasks.md",
        content: this.formatTasks(output.tasks),
      },
    ];
  }

  private formatTechSteering(steering: TechSteering): string {
    const lines: string[] = [];

    lines.push("## Stack Selection");
    lines.push("");
    for (const tech of steering.stack) {
      lines.push(`- ${tech}`);
    }
    lines.push("");

    lines.push("## Architecture Pattern");
    lines.push("");
    lines.push(steering.architecturePattern);
    lines.push("");

    lines.push("## SOLID Boundaries");
    lines.push("");
    lines.push("| Principle | Rule | Layer |");
    lines.push("| --- | --- | --- |");
    for (const boundary of steering.solidBoundaries) {
      lines.push(
        `| ${boundary.principle} | ${boundary.rule} | ${boundary.layer} |`,
      );
    }
    lines.push("");

    lines.push("## Security Policies");
    lines.push("");
    lines.push("| Name | Description | Enforcement |");
    lines.push("| --- | --- | --- |");
    for (const guard of steering.securityGuards) {
      lines.push(
        `| ${guard.name} | ${guard.description} | ${guard.enforcement} |`,
      );
    }
    lines.push("");

    return lines.join("\n");
  }

  private formatDesign(design: DesignOutput): string {
    const lines: string[] = [];

    lines.push("## Domain Entities");
    lines.push("");
    for (const entity of design.domainEntities) {
      lines.push(`### ${entity.name}`);
      lines.push("");
      lines.push("Properties:");
      for (const prop of entity.properties) {
        lines.push(
          `- ${prop.name}: ${prop.type}${prop.required ? " (required)" : " (optional)"}`,
        );
      }
      if (entity.relationships.length > 0) {
        lines.push("");
        lines.push(`Relationships: ${entity.relationships.join(", ")}`);
      }
      lines.push("");
    }

    lines.push("## Sequence Diagram");
    lines.push("");
    lines.push("```mermaid");
    lines.push(design.mermaidDiagram);
    lines.push("```");
    lines.push("");

    lines.push("## IAM Policies");
    lines.push("");
    lines.push("| Service | Actions | Resource | Effect |");
    lines.push("| --- | --- | --- | --- |");
    for (const policy of design.iamPolicySummary) {
      lines.push(
        `| ${policy.service} | ${policy.actions.join(", ")} | ${policy.resource} | ${policy.effect} |`,
      );
    }
    lines.push("");

    lines.push("## AWS Cost Projection");
    lines.push("");
    lines.push("### MVP");
    lines.push("");
    lines.push("| Service | Monthly Cost (USD) |");
    lines.push("| --- | --- |");
    for (const cost of design.awsCostProjection.mvpMonthlyCostUsd) {
      lines.push(`| ${cost.service} | $${cost.monthlyCostUsd.toFixed(2)} |`);
    }
    lines.push("");

    lines.push("### Scale");
    lines.push("");
    lines.push("| Service | Monthly Cost (USD) |");
    lines.push("| --- | --- |");
    for (const cost of design.awsCostProjection.scaleMonthlyCostUsd) {
      lines.push(`| ${cost.service} | $${cost.monthlyCostUsd.toFixed(2)} |`);
    }
    lines.push("");

    return lines.join("\n");
  }

  private formatTasks(tasks: TaskItem[]): string {
    const lines: string[] = [];

    lines.push("## Tasks");
    lines.push("");
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]!;
      const deps =
        task.dependencies.length > 0
          ? ` (depends on: ${task.dependencies.join(", ")})`
          : "";
      lines.push(`${i + 1}. **${task.id}**: ${task.title}${deps}`);
      lines.push(`   ${task.description}`);
      lines.push("");
    }

    return lines.join("\n");
  }
}
