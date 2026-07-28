// src/__tests__/generators/arb-agent4-output.ts — Arbitrary Agent4Output with artifact variants
import fc from "fast-check";
import type { Agent4Output, Agent4Hooks } from "@/domain/types";

const XSS_PAYLOAD = `<script>alert('xss')</script>`;

/**
 * Generates artifact strings that can be:
 * - absent/empty (empty string)
 * - normal (10-100 chars)
 * - oversized (20001+ chars)
 * - containing HTML markup like <script>alert('xss')</script>
 */
const arbArtifact: fc.Arbitrary<string> = fc.oneof(
  // absent/empty
  fc.constant(""),
  // normal (10-100 chars)
  fc.string({ minLength: 10, maxLength: 100 }),
  // oversized (20001+ chars)
  fc.string({ minLength: 20001, maxLength: 20100 }),
  // containing HTML/XSS markup
  fc.string({ minLength: 5, maxLength: 50 }).map((s) => `${s}${XSS_PAYLOAD}${s}`),
  fc.constant(XSS_PAYLOAD.repeat(100)),
);

/**
 * Hook scripts must start with "#!/" and have min 10 chars per the domain type.
 * This generator produces valid and invalid variants.
 */
const arbHookScript: fc.Arbitrary<string> = fc.oneof(
  fc.constant(""),
  fc.string({ minLength: 10, maxLength: 100 }).map((s) => `#!/bin/bash\n${s}`),
  fc.string({ minLength: 20001, maxLength: 20100 }).map((s) => `#!/bin/sh\n${s}`),
  fc.constant(`#!/bin/bash\necho "${XSS_PAYLOAD}"`),
);

const arbHooks: fc.Arbitrary<Agent4Hooks> = fc.record({
  validateSpecs: arbHookScript,
  scanSecrets: arbHookScript,
});

export const arbAgent4Output: fc.Arbitrary<Agent4Output> = fc.record({
  dockerfile: arbArtifact,
  dockerCompose: arbArtifact,
  ciPipeline: arbArtifact,
  hooks: arbHooks,
});

export { arbArtifact, arbHookScript };
