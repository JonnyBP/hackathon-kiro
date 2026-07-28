// src/infrastructure/writers/agent4-file-writer.ts — Filesystem writer for Agent 4 output artifacts
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Agent4Output } from "@/domain/types";
import { Agent4FileWriterPort } from "@/application/generate-devsecops-spec";
import { FilesystemError } from "@/domain/errors";

interface FileMapping {
  relativePath: string;
  content: string;
  executable: boolean;
}

export class Agent4FileWriter implements Agent4FileWriterPort {
  async writeAll(output: Agent4Output, basePath: string): Promise<void> {
    const mappings = this.buildFileMappings(output);

    for (const mapping of mappings) {
      const fullPath = join(basePath, mapping.relativePath);
      const dir = dirname(fullPath);
      try {
        await mkdir(dir, { recursive: true });
        await writeFile(fullPath, mapping.content, "utf-8");
        if (mapping.executable) {
          await chmod(fullPath, 0o755);
        }
      } catch (error) {
        throw new FilesystemError(
          fullPath,
          "file-write",
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
  }

  private buildFileMappings(output: Agent4Output): FileMapping[] {
    return [
      {
        relativePath: "Dockerfile",
        content: output.dockerfile,
        executable: false,
      },
      {
        relativePath: "docker-compose.yml",
        content: output.dockerCompose,
        executable: false,
      },
      {
        relativePath: ".github/workflows/ci.yml",
        content: output.ciPipeline,
        executable: false,
      },
      {
        relativePath: ".kiro/hooks/validate-specs.sh",
        content: output.hooks.validateSpecs,
        executable: true,
      },
      {
        relativePath: ".kiro/hooks/scan-secrets.sh",
        content: output.hooks.scanSecrets,
        executable: true,
      },
    ];
  }
}
