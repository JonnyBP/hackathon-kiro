// src/infrastructure/writers/no-op-file-writer.ts — Inert writer for HTTP requests
//
// GenerateArchitectureSpecUseCase and GenerateDevSecOpsSpecUseCase call
// fileWriter.writeAll(...) as their last step. HTTP requests must never write to the
// repository (Requirement 21.11, design decision D10), so the four route handlers
// inject this writer instead of KiroFileWriter / Agent4FileWriter, which stay
// reserved for the console scripts.

import { Agent2Output, Agent4Output } from "@/domain/types";
import { FileWriterPort } from "@/application/generate-architecture-spec";
import { Agent4FileWriterPort } from "@/application/generate-devsecops-spec";

/** A recorded writeAll invocation, exposed for tests. */
export interface NoOpWriteInvocation {
  readonly output: Agent2Output | Agent4Output;
  readonly basePath: string;
}

export class NoOpFileWriter implements FileWriterPort, Agent4FileWriterPort {
  private readonly records: NoOpWriteInvocation[] = [];

  /** Invocations recorded so far. Empty means nothing was ever written. */
  get invocations(): readonly NoOpWriteInvocation[] {
    return this.records;
  }

  async writeAll(
    output: Agent2Output | Agent4Output,
    basePath: string,
  ): Promise<void> {
    // Deliberately does not touch the filesystem.
    this.records.push({ output, basePath });
  }
}
