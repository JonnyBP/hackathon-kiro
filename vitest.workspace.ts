import { fileURLToPath } from "node:url";
import { defineWorkspace } from "vitest/config";
import react from "@vitejs/plugin-react";

// fileURLToPath is required instead of URL.pathname: on Windows, and on any path
// containing spaces, pathname yields a leading slash and percent-encoded segments
// (e.g. "/C:/My%20Project/src"), which Vite cannot resolve.
const srcDir = fileURLToPath(new URL("./src", import.meta.url));

export default defineWorkspace([
  {
    resolve: {
      alias: {
        "@": srcDir,
      },
    },
    test: {
      name: "node",
      include: [
        "src/{domain,application,infrastructure}/**/*.{test,property}.ts",
        "src/app/api/**/*.test.ts",
        "src/__tests__/**/*.{test,property}.ts",
      ],
    },
  },
  {
    plugins: [react()],
    resolve: {
      alias: {
        "@": srcDir,
      },
    },
    test: {
      name: "jsdom",
      environment: "jsdom",
      include: [
        "src/app/_components/**/*.{test,property}.tsx",
        "src/app/_hooks/**/*.{test,property}.tsx",
        "src/__tests__/**/*.{test,property}.tsx",
      ],
      setupFiles: ["src/__tests__/setup-jsdom.ts"],
    },
  },
]);
