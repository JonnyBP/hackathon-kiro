// src/app/api/_shared/agent4-input-composer.ts — Server-side composition of Agent4Input
//
// The DevSecOps request body is partial by design (decision D7): the Frontend fires the
// four requests in the same tick, so Agent 2 and Agent 3 data may not exist yet. Every
// field derived from another agent is optional and filled here, on the server, from
// `.kiro/mocks/agent4.input.mock.json`.
//
// Note on the mock files: `.kiro/mocks/agent4.mock.json` holds an Agent4 *Output* (the
// mocked LLM response used by `npm run demo-agent4`), so it cannot supply input gaps.
// The input defaults live in `.kiro/mocks/agent4.input.mock.json`.

import { Agent4JsonMockLoader } from "@/infrastructure/mocks/agent4-mock-loader";
import { DevSecOpsRequest } from "@/domain/api-contracts";
import { Agent4Input } from "@/domain/types";

export const AGENT4_INPUT_MOCK_PATH = ".kiro/mocks/agent4.input.mock.json";
export const AGENT4_OUTPUT_MOCK_PATH = ".kiro/mocks/agent4.mock.json";

/** Completes a partial DevSecOps request into a full Agent4Input (decision D7). */
export async function composeAgent4Input(
  request: DevSecOpsRequest,
  inputMockPath: string = AGENT4_INPUT_MOCK_PATH,
): Promise<Agent4Input> {
  const {
    projectName,
    stack,
    architecturePattern,
    securityPolicies,
    taskList,
    complianceReport,
  } = request;

  // Nothing to fill: the caller already supplied every derived field.
  if (
    stack !== undefined &&
    architecturePattern !== undefined &&
    securityPolicies !== undefined &&
    taskList !== undefined &&
    complianceReport !== undefined
  ) {
    return {
      projectName,
      stack,
      architecturePattern,
      securityPolicies: securityPolicies as Agent4Input["securityPolicies"],
      taskList: taskList as Agent4Input["taskList"],
      complianceReport: complianceReport as Agent4Input["complianceReport"],
    };
  }

  const defaults = await new Agent4JsonMockLoader(inputMockPath).load();

  return {
    projectName,
    stack: stack ?? defaults.stack,
    architecturePattern: architecturePattern ?? defaults.architecturePattern,
    securityPolicies: (securityPolicies ?? defaults.securityPolicies) as Agent4Input["securityPolicies"],
    taskList: (taskList ?? defaults.taskList) as Agent4Input["taskList"],
    complianceReport: (complianceReport ?? defaults.complianceReport) as Agent4Input["complianceReport"],
  };
}
