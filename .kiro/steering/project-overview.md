---
inclusion: always
---

# KiroSpec Builder

KiroSpec Builder is an AI-powered development agent system that acts as an automated Product Manager and Software Architect. It converts informal product ideas, customer requests, or meeting notes into structured, validated Kiro Specifications (.kiro/specs) ready to be executed by coding agents.

## Pipeline Overview

The system follows a sequential 4-agent pipeline:

```
Idea/Input → Agent 1 → Agent 2 → Agent 3 → Agent 4 → Ready to Code
```

## Project Structure

```
hackathon-kiro/
├── src/
│   ├── app/                           # Next.js App Router: the ONLY place routes are served from
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/generate-spec/route.ts # Agent 2 endpoint
│   ├── domain/                        # Pure types, Zod schemas, typed errors
│   │   ├── types.ts
│   │   ├── schemas.ts
│   │   └── errors.ts
│   ├── application/                   # Use cases + port interfaces
│   │   ├── generate-architecture-spec.ts
│   │   └── generate-devsecops-spec.ts
│   ├── infrastructure/                # Adapters, grouped by concern
│   │   ├── llm/                       # vercel-ai-llm-client.ts, mock-llm-client.ts
│   │   ├── writers/                   # kiro-file-writer.ts, agent4-file-writer.ts
│   │   └── mocks/                     # mock-loader.ts, agent4-mock-loader.ts
│   ├── prompts/                       # One system prompt per agent
│   │   ├── architect-agent.ts         # ARCHITECT_SYSTEM_PROMPT   (Agent 2)
│   │   ├── compliance-agent.ts        # COMPLIANCE_SYSTEM_PROMPT  (Agent 3)
│   │   └── devsecops-agent.ts         # DEVSECOPS_SYSTEM_PROMPT   (Agent 4)
│   ├── __tests__/                     # Mirrors src layout: domain/, application/, infrastructure/, integration/
│   └── index.ts                       # Factories: createAgent2(), createAgent4()
├── agents/
│   └── pm-market-strategist/          # Agent 1: prompt, config, templates, examples (no TS implementation)
├── shared/schemas/                    # JSON contracts not yet modelled in TS
│   └── market-report-schema.json      # Agent 1 output contract
├── scripts/                           # demo.ts (Agent 2), demo-agent4.ts (Agent 4)
├── docs/                              # Team handoff documentation
└── .kiro/
    ├── hooks/                         # validate-specs.sh, scan-secrets.sh (from Agent 4)
    ├── mocks/                         # agent1, agent2, agent4 mock payloads
    ├── steering/                      # product.md, tech.md, project-overview.md, compliance.md
    └── specs/                         # Generated Kiro specs, one folder per feature
```

## Import conventions

- Use the `@/*` path alias (mapped to `src/*`) for cross-layer imports. Relative imports are for siblings only.
- Route handlers must live under `src/app/**`. Anything placed elsewhere is never served by Next.js.

## Agents Overview

| # | Agent | Responsibility | Key Outputs |
|---|-------|---------------|-------------|
| 1 | **PM & Market Strategist** | Market validation, competitive analysis, feasibility scoring | HTML report + JSON data + `.kiro/steering/product.md` |
| 2 | **Software Architect & Financial Officer** | Stack selection, Clean Architecture, EARS requirements, AWS costs | `.kiro/steering/tech.md`, `.kiro/specs/requirements.md`, `.kiro/specs/design.md`, `.kiro/specs/tasks.md` |
| 3 | **Legal, Compliance & Privacy Guard** | Open Source licenses, GDPR, privacy risks | `.kiro/specs/compliance.md` |
| 4 | **DevSecOps & Test Automation Engineer** | Docker, CI/CD, test stubs, automation scripts | `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, hooks |
