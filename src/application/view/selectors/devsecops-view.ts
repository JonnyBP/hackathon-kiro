// src/application/view/selectors/devsecops-view.ts — DevSecOps section view selector (pure TS, no React)

import type { Agent4Output } from "@/domain/types";
import { truncarTexto } from "./truncate-text";

export interface DevSecOpsArtifactView {
  ruta: string;
  contenidoVisible: string;
  contenidoCompleto: string;
  truncado: boolean;
  presente: boolean;
}

export interface DevSecOpsViewResult {
  artifacts: DevSecOpsArtifactView[];
  cantidadPresentes: number;
}

const ARTIFACT_ROUTES = [
  "Dockerfile",
  "docker-compose.yml",
  ".github/workflows/ci.yml",
  ".kiro/hooks/validate-specs.sh",
  ".kiro/hooks/scan-secrets.sh",
] as const;

const TRUNCATE_LIMIT = 20000;

function isPresent(value: unknown): value is string {
  return value != null && typeof value === "string" && value.length > 0;
}

export function calcularVistaDeDevSecOps(output: Agent4Output): DevSecOpsViewResult {
  const rawValues: (unknown)[] = [
    output.dockerfile,
    output.dockerCompose,
    output.ciPipeline,
    output.hooks?.validateSpecs,
    output.hooks?.scanSecrets,
  ];

  const artifacts: DevSecOpsArtifactView[] = ARTIFACT_ROUTES.map((ruta, index) => {
    const raw = rawValues[index];
    const presente = isPresent(raw);

    if (!presente) {
      return {
        ruta,
        contenidoVisible: "",
        contenidoCompleto: "",
        truncado: false,
        presente: false,
      };
    }

    const { visible, completo, truncado } = truncarTexto(raw as string, TRUNCATE_LIMIT);
    return {
      ruta,
      contenidoVisible: visible,
      contenidoCompleto: completo,
      truncado,
      presente: true,
    };
  });

  const cantidadPresentes = artifacts.filter((a) => a.presente).length;

  return { artifacts, cantidadPresentes };
}
