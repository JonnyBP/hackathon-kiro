"use client";

import { useState } from "react";
import { runPipeline } from "../actions/pipeline";
import type { PipelineResult } from "../actions/pipeline";

type AgentStatus = "idle" | "running" | "done";

interface AgentStep {
  id: number;
  name: string;
  role: string;
  emoji: string;
  outputs: string[];
}

const AGENTS: AgentStep[] = [
  {
    id: 1,
    name: "PM & Market Strategist",
    role: "Market validation, competitive analysis, feasibility",
    emoji: "📊",
    outputs: [".kiro/steering/product.md"],
  },
  {
    id: 2,
    name: "Software Architect",
    role: "Stack, Clean Architecture, EARS, AWS costs",
    emoji: "🏗️",
    outputs: [
      ".kiro/steering/tech.md",
      ".kiro/specs/requirements.md",
      ".kiro/specs/design.md",
      ".kiro/specs/tasks.md",
    ],
  },
  {
    id: 3,
    name: "Legal & Compliance",
    role: "GDPR, licenses, privacy risks",
    emoji: "⚖️",
    outputs: [".kiro/specs/compliance.md"],
  },
  {
    id: 4,
    name: "DevSecOps Engineer",
    role: "Docker, CI/CD, security hooks",
    emoji: "🔒",
    outputs: ["Dockerfile", "docker-compose.yml", ".github/workflows/ci.yml"],
  },
];

type OutputTab =
  | "product"
  | "tech"
  | "requirements"
  | "design"
  | "tasks"
  | "compliance"
  | "dockerfile"
  | "ci";

const TAB_LABELS: Record<OutputTab, string> = {
  product: "Product",
  tech: "Tech Steering",
  requirements: "Requirements",
  design: "Design",
  tasks: "Tasks",
  compliance: "Compliance",
  dockerfile: "Dockerfile",
  ci: "CI/CD",
};

export default function PipelineDemo() {
  const [statuses, setStatuses] = useState<AgentStatus[]>([
    "idle",
    "idle",
    "idle",
    "idle",
  ]);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OutputTab>("product");
  const [isRunning, setIsRunning] = useState(false);

  async function handleRun() {
    setError(null);
    setResult(null);
    setIsRunning(true);
    setStatuses(["idle", "idle", "idle", "idle"]);

    // Animate each agent step with delays
    for (let i = 0; i < 4; i++) {
      setStatuses((prev) => {
        const next = [...prev];
        next[i] = "running";
        return next;
      });
      await delay(800 + Math.random() * 400);
      setStatuses((prev) => {
        const next = [...prev];
        next[i] = "done";
        return next;
      });
    }

    // Actually fetch data
    const res = await runPipeline();
    if (res.success) {
      setResult(res);
      setError(null);
    } else {
      setError(res.error);
    }
    setIsRunning(false);
  }

  function getTabContent(): string {
    if (!result || !result.success) return "";
    switch (activeTab) {
      case "product":
        return result.outputs.product;
      case "tech":
        return result.outputs.tech;
      case "requirements":
        return result.outputs.requirements;
      case "design":
        return result.outputs.design;
      case "tasks":
        return result.outputs.tasks;
      case "compliance":
        return result.outputs.compliance;
      case "dockerfile":
        return result.outputs.dockerfile;
      case "ci":
        return result.outputs.ci;
    }
  }

  return (
    <>
      {/* Pipeline visualization */}
      <div className="pipeline">
        {AGENTS.map((agent, i) => (
          <div
            key={agent.id}
            className={`pipeline-step ${statuses[i] ?? "idle"}`}
          >
            <div className="step-header">
              <span className="step-emoji">{agent.emoji}</span>
              <span className="step-number">Agent {agent.id}</span>
              <StatusIcon status={statuses[i] ?? "idle"} />
            </div>
            <div className="step-name">{agent.name}</div>
            <div className="step-role">{agent.role}</div>
            <div className="step-outputs">
              {agent.outputs.map((o) => (
                <span key={o} className="output-badge">
                  {o}
                </span>
              ))}
            </div>
            {i < 3 && <div className="step-arrow">→</div>}
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="input-area">
        <div className="idea-box">
          <label htmlFor="idea">Product Idea</label>
          <textarea
            id="idea"
            defaultValue="An AI-powered spec generation platform that transforms product ideas into validated architecture documents with cost projections and compliance checks."
            rows={3}
            readOnly
          />
        </div>
        <button
          className="generate-btn"
          onClick={handleRun}
          disabled={isRunning}
          type="button"
        >
          {isRunning && <span className="spinner" />}
          {isRunning ? "Running Pipeline..." : "▶ Run Full Pipeline"}
        </button>
      </div>

      {error && <div className="error-message">Error: {error}</div>}

      {/* Output tabs */}
      {result && result.success && (
        <>
          <div className="status-badge success">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
            </svg>
            Pipeline complete — all specs validated
          </div>

          <div className="tabs">
            {(Object.keys(TAB_LABELS) as OutputTab[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`tab-btn ${activeTab === key ? "active" : ""}`}
                onClick={() => setActiveTab(key)}
              >
                {TAB_LABELS[key]}
              </button>
            ))}
          </div>

          <div className="tab-content">
            <pre>{getTabContent()}</pre>
          </div>
        </>
      )}
    </>
  );
}

function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === "idle") return <span className="status-dot idle">○</span>;
  if (status === "running")
    return <span className="status-dot running">◌</span>;
  return <span className="status-dot done">✓</span>;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
