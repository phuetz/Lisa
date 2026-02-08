/**
 * Utility for safely importing optional dependencies.
 *
 * Uses dynamic import with @vite-ignore to prevent Vite from statically
 * resolving the module at build time. Returns null if the module is not installed.
 *
 * Usage:
 *   const Octokit = await safeImport('@octokit/rest', 'Octokit');
 *   if (!Octokit) { throw new Error('@octokit/rest is not installed'); }
 */

const moduleCache = new Map<string, any>();

/**
 * Dynamically import a module that may not be installed.
 * @param moduleName - The npm package name (e.g. '@octokit/rest')
 * @param exportName - Optional named export to extract (e.g. 'Octokit'). If omitted, returns the full module.
 * @returns The module/export, or null if not available.
 */
export async function safeImport<T = any>(
  moduleName: string,
  exportName?: string
): Promise<T | null> {
  const cacheKey = `${moduleName}:${exportName ?? '*'}`;

  if (moduleCache.has(cacheKey)) {
    const cached = moduleCache.get(cacheKey);
    // Don't cache failures — module may be installed later
    if (cached !== null) return cached;
  }

  try {
    // Variable prevents Vite's static analysis from resolving at build time
    const pkg = moduleName;
    const mod = await import(/* @vite-ignore */ pkg);
    const result = exportName
      ? mod[exportName] ?? mod.default?.[exportName] ?? null
      : mod;

    moduleCache.set(cacheKey, result);
    return result as T;
  } catch {
    // Don't cache failures so retries work after install
    return null;
  }
}

/**
 * Clear the module cache (useful for testing).
 */
export function clearSafeImportCache(): void {
  moduleCache.clear();
}
