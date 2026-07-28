// src/domain/api-contracts.ts — Zod schemas for the four API endpoint request bodies
import { z } from "zod";
import { Agent1OutputSchema, TechSteeringSchema } from "@/domain/schemas";

export const MarketRequestSchema = z.object({
  brief: Agent1OutputSchema,
  regions: z.array(z.string()).max(6).optional(),
  constraints: z.string().max(500).optional(),
});

export const SpecRequestSchema = z.object({
  agent1Output: Agent1OutputSchema,
  preferredStack: z.array(z.string()).max(20).optional(),
});

export const ComplianceRequestSchema = z.object({
  brief: Agent1OutputSchema,
  techSteering: TechSteeringSchema.optional(),
  regions: z.array(z.string()).max(6).optional(),
});

export const DevSecOpsRequestSchema = z.object({
  projectName: z.string().min(1).max(128),
  stack: z.array(z.string()).min(1).max(20).optional(),
  architecturePattern: z.string().optional(),
  securityPolicies: z.array(z.unknown()).optional(),
  taskList: z.array(z.unknown()).optional(),
  complianceReport: z.unknown().optional(),
});

export type MarketRequest = z.infer<typeof MarketRequestSchema>;
export type SpecRequest = z.infer<typeof SpecRequestSchema>;
export type ComplianceRequest = z.infer<typeof ComplianceRequestSchema>;
export type DevSecOpsRequest = z.infer<typeof DevSecOpsRequestSchema>;
