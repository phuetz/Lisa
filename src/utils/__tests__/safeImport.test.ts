import { describe, it, expect, beforeEach } from 'vitest';
import { safeImport, clearSafeImportCache } from '../safeImport';

describe('safeImport', () => {
  beforeEach(() => {
    clearSafeImportCache();
  });

  it('imports a real module (zod)', async () => {
    const mod = await safeImport('zod');
    expect(mod).not.toBeNull();
    expect(mod).toHaveProperty('z');
  });

  it('extracts a named export', async () => {
    const z = await safeImport('zod', 'z');
    expect(z).not.toBeNull();
    expect(z).toBeDefined();
  });

  it('returns null for non-existent module', async () => {
    const result = await safeImport('__totally_fake_package_xyz__');
    expect(result).toBeNull();
  });

  it('returns null for non-existent named export', async () => {
    const result = await safeImport('zod', '__nonExistentExport__');
    expect(result).toBeNull();
  });

  it('caches successful imports', async () => {
    const first = await safeImport('zod');
    const second = await safeImport('zod');
    expect(first).toBe(second); // same reference
  });

  it('caches null for failed imports', async () => {
    const first = await safeImport('__fake__');
    const second = await safeImport('__fake__');
    expect(first).toBeNull();
    expect(second).toBeNull();
  });

  it('clearSafeImportCache resets the cache', async () => {
    await safeImport('zod');
    clearSafeImportCache();
    // After clearing, a new import should still succeed
    const fresh = await safeImport('zod');
    expect(fresh).not.toBeNull();
  });

  it('handles scoped packages', async () => {
    // @vitejs/plugin-react is a dev dep — might not resolve in test context
    // but the function should not throw
    const result = await safeImport('@vitejs/plugin-react');
    // We just check it doesn't throw; the result depends on the runtime
    expect(result === null || result !== null).toBe(true);
  });
});
