// src/application/view/selectors/url-slug.ts — URL slug utilities (pure TS, no React)

/**
 * Normalizes a project name into a URL-safe slug:
 * - Lowercase
 * - Replace accented characters with base letters
 * - Remove anything that isn't a-z, 0-9 or -
 * - Truncate to 40 characters
 */
export function normalizeProjectName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);
  return slug;
}

/**
 * Builds a simulated URL from a project name.
 * Returns `kiro-spec-studio.app/resultados/${slug}` or just the base when slug is empty.
 */
export function buildSimulatedUrl(name: string): string {
  const slug = normalizeProjectName(name);
  if (slug === "") {
    return "kiro-spec-studio.app/resultados";
  }
  return `kiro-spec-studio.app/resultados/${slug}`;
}

/**
 * Builds the zip filename from a project name.
 * Returns `kirospec-${slug}.zip` or `kirospec-reporte.zip` when slug is empty.
 */
export function buildZipFilename(name: string): string {
  const slug = normalizeProjectName(name);
  if (slug === "") {
    return "kirospec-reporte.zip";
  }
  return `kirospec-${slug}.zip`;
}
