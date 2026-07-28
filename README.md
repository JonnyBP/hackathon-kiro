# KiroSpec Studio

> Real-time software specification and engineering powered by coordinated AI agents.

## 📋 Overview

KiroSpec Studio is an AI-agent-powered software specification tool. Through a guided conversational experience (Architect Wizard), the system takes an abstract software idea and automatically transforms it into a complete technical package inside a minimalist IDE-like environment (Workbench). It generates detailed specifications, architecture design, compliance matrices, and real DevSecOps artifacts with verified test suites.

### The Problem

Bridging the gap between a software idea and a production-ready, secure technical architecture is expensive. Writing specs, diagramming architectures, verifying privacy regulations (GDPR/compliance), and configuring CI/CD pipelines typically requires weeks of senior engineering time. KiroSpec Studio automates this entire process in minutes through a coordinated multi-agent pipeline that delivers functional, tested artifacts — no fakes, no static data.

### This Repository

Implements **Agent 2** (Software Architect) and **Agent 4** (DevSecOps), and contains the prompts/guidelines for **Agent 1** (PM) and **Agent 3** (Legal).

## 📦 Tech Stack

| Layer          | Technology                                               |
| -------------- | -------------------------------------------------------- |
| Runtime        | Node.js 22, TypeScript 5.8 (strict)                      |
| Framework      | Next.js 15 (App Router)                                  |
| LLM            | Vercel AI SDK (`generateObject` with schema enforcement) |
| Validation     | Zod (compile-time types + runtime validation)            |
| Testing        | Vitest + fast-check (property-based testing)             |
| Infrastructure | Docker multi-stage, GitHub Actions CI/CD                 |
| Offline Mode   | MockLlmClient with pre-built responses                   |

## 🏗️ Pipeline

```
Idea → Agent 1 → Agent 2 → Agent 3 → Agent 4 → 🚀 Ready to Code
```

| #   | Agent                  | Responsibility                                          | Output                                                | Status         |
| --- | ---------------------- | ------------------------------------------------------- | ----------------------------------------------------- | -------------- |
| 1   | PM & Market Strategist | Market validation, competition, TAM/SAM/SOM             | HTML report + JSON + `product.md`                     | 📝 Guidelines  |
| 2   | Software Architect     | Stack, Clean Architecture, EARS requirements, AWS costs | `tech.md`, `requirements.md`, `design.md`, `tasks.md` | ✅ Implemented |
| 3   | Legal & Compliance     | Privacy, licenses, GDPR/LFPDPPP, regulations            | `compliance.md` with Agent 4 payload                  | 📝 Guidelines  |
| 4   | DevSecOps & Automation | Docker, CI/CD, security hooks                           | `Dockerfile`, `docker-compose.yml`, `ci.yml`, hooks   | ✅ Implemented |

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Demo Agent 2 — generates architecture specs (offline, no API key needed)
npm run demo

# Demo Agent 4 — generates Dockerfile, CI/CD, hooks (offline, no API key needed)
npm run demo-agent4

# Run all 125 tests
npm test

# Development server (Next.js)
npm run dev
```

## 🖥️ Frontend (UI Demo)

The visual interface lives on the [`feat/ui-demo`](https://github.com/elecodes/hackathon-kiro/tree/feat/ui-demo) branch.

**Run it locally:**

```bash
git clone https://github.com/elecodes/hackathon-kiro.git
cd hackathon-kiro
git checkout feat/ui-demo
npm install
npm run dev
# Open http://localhost:3000
```

Features:

- 4-agent pipeline visualization with animated status (idle → running → done)
- Product idea input with pre-filled example
- "Run Full Pipeline" button triggers all agents sequentially
- 8 output tabs: Product, Tech Steering, Requirements, Design, Tasks, Compliance, Dockerfile, CI/CD
- Reads real `.kiro/` workspace files, falls back to mock data when files don't exist
- Works 100% offline, no API keys needed
- Dark theme (GitHub-style), responsive layout

Full design spec in [`ui-design.md`](./ui-design.md).

## 📁 Project Structure

```
hackathon-kiro/
├── src/
│   ├── domain/              ← Pure types, Zod schemas, typed errors
│   ├── application/         ← Use cases + port interfaces
│   ├── infrastructure/      ← Adapters (Vercel AI SDK, filesystem, mocks)
│   ├── presentation/        ← REST API (Next.js App Router)
│   ├── config/              ← LLM system prompts
│   ├── lib/prompts/         ← Compliance agent prompt
│   ├── __tests__/           ← Unit + property-based + integration tests
│   └── index.ts             ← Factories: createAgent2(), createAgent4()
├── agents/
│   └── pm-market-strategist/ ← Agent 1 prompt, config, templates, examples
├── scripts/
│   ├── demo.ts              ← Agent 2 offline demo
│   └── demo-agent4.ts       ← Agent 4 offline demo
├── shared/schemas/          ← Shared validation schemas
├── docs/                    ← Team documentation
├── .kiro/
│   ├── mocks/               ← Mock responses for demos
│   ├── steering/            ← Generated steering files
│   └── specs/               ← Generated spec files
├── .github/workflows/       ← CI/CD pipeline
├── Dockerfile               ← Multi-stage build (deps → build → runtime)
├── docker-compose.yml       ← App + PostgreSQL with isolated networks
└── vitest.config.ts         ← Test configuration
```

## 🧩 Agent 1 — PM & Market Strategist (guidelines)

**Location:** `agents/pm-market-strategist/`

Contains the full prompt, configuration, HTML templates, and example I/O for the market analysis agent. No technical implementation required — it's a guide for an external LLM that produces:

- Market analysis with TAM/SAM/SOM
- Competitive landscape (minimum 3 competitors)
- Feasibility scorecard (1-10)
- Monetization model canvas
- Failure mode analysis with kill criteria

## 🧩 Agent 2 — Software Architect (implemented)

**Input:** `Agent1Output` (projectName, productVision, targetAudience, mvpFeatures, expectedMetrics)

**Output:**

| File                          | Content                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| `.kiro/steering/tech.md`      | Stack, Clean Architecture, SOLID, security policies, deployment geography, auth config, AI config |
| `.kiro/specs/requirements.md` | Requirements in EARS syntax (WHEN/SHALL)                                                          |
| `.kiro/specs/design.md`       | DDD entities, Mermaid diagram, IAM policies, AWS costs                                            |
| `.kiro/specs/tasks.md`        | Sequential tasks with dependency ordering                                                         |

**Usage:**

```typescript
// Offline (mock — no API key)
const agent2 = createAgent2({ mockLlmResponse: mockData });
const result = await agent2.execute();

// With real LLM (requires OPENAI_API_KEY)
const agent2 = createAgent2({ model: "gpt-4o" });
const result = await agent2.execute({ agent1Output, preferredStack });
```

**API:** `POST /api/generate-spec` → 200 (success) / 400 (validation) / 502 (LLM transient) / 500 (permanent)

**Extended output (v2):** Agent 2 also produces `deploymentRegion`, `dataStorageRegion`, `authConfig` (provider, loginMethods, mfa, sessionLifetime, authorizationModel), and `aiConfig` (model, provider, region, personalDataInPrompts, promptLogging) — consumed by Agent 3 for compliance analysis and Agent 4 for infrastructure decisions.

## 🧩 Agent 3 — Legal & Compliance (guidelines)

**Location:** `src/lib/prompts/compliance-agent.ts`

System prompt for an external agent to perform legal audits based on Agent 1 and Agent 2 outputs. Covers:

- Privacy and data-protection assessment
- Open-source license audit (risk classification)
- Regulatory flags for Agent 4
- Machine-readable JSON payload (`json:agent4-payload`)

Full handoff documentation in `docs/legal-compliance-handoff.md`.

## 🧩 Agent 4 — DevSecOps & Automation (implemented)

**Input:** projectName, stack, architecturePattern, securityPolicies, taskList, complianceReport

**Output:**

| File                            | Content                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `Dockerfile`                    | Multi-stage build (deps → build → runtime), non-root user, healthcheck  |
| `docker-compose.yml`            | App + DB with isolated networks and persistent volumes                  |
| `.github/workflows/ci.yml`      | Pipeline: lint, typecheck, test, security, license-check, build, deploy |
| `.kiro/hooks/validate-specs.sh` | Validates spec file existence and format                                |
| `.kiro/hooks/scan-secrets.sh`   | Scans staged files for leaked credentials                               |

```typescript
const agent4 = createAgent4({ mockLlmResponse: mockData });
const result = await agent4.execute(input);
```

## 🏛️ Data Flow

```
Input (idea) → Zod Validation → LLM (GPT-4o) → Zod Validation → .kiro/ files
```

The codebase follows **Clean Architecture**: types and business rules live in `domain/`, orchestration logic in `application/`, and adapters (LLM, filesystem) in `infrastructure/`. Swap LLM providers by implementing the `LlmPort` interface — zero changes to domain or application layers.

## ✅ Testing (125 tests)

```bash
npm test              # Run all tests
npm run test:coverage # With coverage report
```

| Category             | Tests   | Covers                                       |
| -------------------- | ------- | -------------------------------------------- |
| Schema unit          | 27      | Valid/invalid objects, edge cases            |
| Error unit           | 11      | Error construction, field propagation        |
| Use case unit        | 16      | Happy path, fallback, error classification   |
| Infrastructure       | 8       | Mock loader, file writer                     |
| Integration          | 25      | Full pipeline end-to-end (Agent 2 + Agent 4) |
| Property-based (PBT) | 38      | 100 iterations each, universal correctness   |
| **Total**            | **125** | **All passing**                              |

**Verified correctness properties:**

1. Schemas reject invalid objects with correct error paths
2. Valid objects round-trip through schemas without data loss
3. File writer preserves all output content
4. Input validation always precedes LLM invocation
5. All errors carry operation name + context
6. Task dependencies form a valid topological order

## 🤝 Integration Guide

**Agent 1 → Agent 2:** Output must conform to `Agent1OutputSchema`. Write to `.kiro/steering/product.md` as JSON, or pass directly to the API.

**Agent 2 → Agent 3:** Consumes `.kiro/specs/design.md` (IAM policies, entities with PII) and `.kiro/steering/tech.md` (stack for license audit).

**Agent 3 → Agent 4:** The `json:agent4-payload` block at the end of `compliance.md` is the contract. Agent 4 parses it via regex.

**Agent 4 → Development:** After Agent 4 completes, `docker compose up` gives you a working dev environment with zero manual configuration.

## 👥 Team

- **Elena Menéndez** ([@elecodes](https://github.com/elecodes)) — Agent 2, UI Demo
- **Jonathan Brasales** ([@JonnyBP](https://github.com/JonnyBP)) — Agent 4, documentation
- **xxx** ([@andriaDev95](https://github.com/andriaDev95)) — Agent 1
- **xxx** ([@Cggtabares](https://github.com/Cggtabares)) — Agent 3

**Organization:** [hackathon-kiro](https://github.com/JonnyBP/hackathon-kiro)
