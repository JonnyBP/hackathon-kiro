// src/__tests__/generators/arb-agent2-output.ts — Arbitrary Agent2Output with valid structure but varying content
import fc from "fast-check";
import type {
  Agent2Output,
  TechSteering,
  SolidBoundary,
  SecurityGuard,
  DesignOutput,
  DomainEntity,
  EntityProperty,
  IamPolicy,
  CostProjection,
  ServiceCost,
  TaskItem,
} from "@/domain/types";

const arbSolidBoundary: fc.Arbitrary<SolidBoundary> = fc.record({
  principle: fc.string({ minLength: 1, maxLength: 80 }),
  rule: fc.string({ minLength: 1, maxLength: 150 }),
  layer: fc.string({ minLength: 1, maxLength: 50 }),
});

const arbSecurityGuard: fc.Arbitrary<SecurityGuard> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 60 }),
  description: fc.string({ minLength: 1, maxLength: 200 }),
  enforcement: fc.string({ minLength: 1, maxLength: 200 }),
});

const arbTechSteering: fc.Arbitrary<TechSteering> = fc.record({
  stack: fc.array(fc.string({ minLength: 1, maxLength: 40 }), { minLength: 1, maxLength: 10 }),
  architecturePattern: fc.constantFrom("Clean" as const, "Hexagonal" as const),
  solidBoundaries: fc.array(arbSolidBoundary, { minLength: 0, maxLength: 5 }),
  securityGuards: fc.array(arbSecurityGuard, { minLength: 0, maxLength: 5 }),
});

const arbEntityProperty: fc.Arbitrary<EntityProperty> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 40 }),
  type: fc.string({ minLength: 1, maxLength: 30 }),
  required: fc.boolean(),
});

const arbDomainEntity: fc.Arbitrary<DomainEntity> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  properties: fc.array(arbEntityProperty, { minLength: 1, maxLength: 8 }),
  relationships: fc.array(fc.string({ minLength: 1, maxLength: 60 }), { minLength: 0, maxLength: 5 }),
});

const arbIamPolicy: fc.Arbitrary<IamPolicy> = fc.record({
  service: fc.string({ minLength: 1, maxLength: 40 }),
  actions: fc.array(fc.string({ minLength: 1, maxLength: 60 }), { minLength: 1, maxLength: 5 }),
  resource: fc.string({ minLength: 1, maxLength: 80 }),
  effect: fc.constantFrom("Allow" as const, "Deny" as const),
});

const arbServiceCost: fc.Arbitrary<ServiceCost> = fc.record({
  service: fc.string({ minLength: 1, maxLength: 50 }),
  monthlyCostUsd: fc.oneof(
    fc.double({ min: 0, max: 10000, noNaN: true }),
    fc.constant(0),
    fc.constant(Infinity),
    fc.constant(-Infinity),
    fc.constant(NaN),
  ),
});

const arbCostProjection: fc.Arbitrary<CostProjection> = fc.record({
  mvpMonthlyCostUsd: fc.array(arbServiceCost, { minLength: 0, maxLength: 10 }),
  scaleMonthlyCostUsd: fc.array(arbServiceCost, { minLength: 0, maxLength: 10 }),
});

const arbDesignOutput: fc.Arbitrary<DesignOutput> = fc.record({
  domainEntities: fc.array(arbDomainEntity, { minLength: 0, maxLength: 8 }),
  mermaidDiagram: fc.string({ minLength: 0, maxLength: 2000 }),
  iamPolicySummary: fc.array(arbIamPolicy, { minLength: 0, maxLength: 10 }),
  awsCostProjection: arbCostProjection,
});

const arbTaskItem: fc.Arbitrary<TaskItem> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 300 }),
  dependencies: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
});

export const arbAgent2Output: fc.Arbitrary<Agent2Output> = fc.record({
  techSteering: arbTechSteering,
  requirements: fc.string({ minLength: 1, maxLength: 500 }),
  design: arbDesignOutput,
  tasks: fc.array(arbTaskItem, { minLength: 0, maxLength: 30 }),
});

export { arbTechSteering, arbDesignOutput, arbTaskItem, arbServiceCost, arbCostProjection };
