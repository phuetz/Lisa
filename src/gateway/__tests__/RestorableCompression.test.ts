import { describe, it, expect, beforeEach } from 'vitest';
import {
  RestorableCompressor,
  getRestorableCompressor,
  resetRestorableCompressor,
} from '../RestorableCompression';

describe('RestorableCompressor', () => {
  let compressor: RestorableCompressor;

  beforeEach(() => {
    compressor = new RestorableCompressor();
  });

  describe('compress', () => {
    it('should keep short entries unchanged', () => {
      const entries = [
        { id: '1', content: 'Short text' },
      ];
      const result = compressor.compress(entries);
      expect(result.entries[0].content).toBe('Short text');
      expect(result.tokensSaved).toBe(0);
    });

    it('should compress entries with file path identifiers', () => {
      const longContent = `Reading file src/components/App.tsx:\n${'x'.repeat(300)}`;
      const entries = [
        { id: '1', content: longContent },
      ];
      const result = compressor.compress(entries);

      expect(result.entries[0].content).toContain('[Content compressed');
      expect(result.identifiers).toContain('src/components/App.tsx');
      expect(result.tokensSaved).toBeGreaterThan(0);
    });

    it('should compress entries with URLs', () => {
      const longContent = `Fetched https://api.example.com/data:\n${'y'.repeat(300)}`;
      const entries = [
        { id: '1', content: longContent },
      ];
      const result = compressor.compress(entries);

      expect(result.entries[0].content).toContain('[Content compressed');
      expect(result.identifiers).toContain('https://api.example.com/data');
    });

    it('should compress entries with tool call IDs', () => {
      const longContent = `Result from call_abc123:\n${'z'.repeat(300)}`;
      const entries = [
        { id: '1', content: longContent },
      ];
      const result = compressor.compress(entries);

      expect(result.identifiers).toContain('call_abc123');
    });

    it('should not compress entries without identifiers', () => {
      const longContent = 'a'.repeat(300);
      const entries = [
        { id: '1', content: longContent },
      ];
      const result = compressor.compress(entries);

      expect(result.entries[0].content).toBe(longContent);
      expect(result.identifiers).toHaveLength(0);
    });

    it('should preserve entry metadata', () => {
      const entries = [
        { id: '42', content: `File src/main.ts content:\n${'x'.repeat(300)}`, type: 'tool_result', metadata: { toolName: 'read' } },
      ];
      const result = compressor.compress(entries);

      expect(result.entries[0].id).toBe('42');
      expect(result.entries[0].type).toBe('tool_result');
      expect(result.entries[0].metadata).toEqual({ toolName: 'read' });
    });
  });

  describe('restore', () => {
    it('should restore compressed content by identifier', () => {
      const content = `Reading src/index.ts:\n${'x'.repeat(300)}`;
      compressor.compress([{ id: '1', content }]);

      const result = compressor.restore('src/index.ts');
      expect(result.found).toBe(true);
      expect(result.content).toBe(content);
    });

    it('should return hint for URL identifiers not found', () => {
      const result = compressor.restore('https://example.com/data');
      expect(result.found).toBe(false);
      expect(result.content).toContain('Fetch');
    });

    it('should return not found for unknown identifiers', () => {
      const result = compressor.restore('unknown_identifier');
      expect(result.found).toBe(false);
      expect(result.content).toContain('not found');
    });
  });

  describe('storeContent', () => {
    it('should manually store content', () => {
      compressor.storeContent('my-key', 'my-value');
      const result = compressor.restore('my-key');
      expect(result.found).toBe(true);
      expect(result.content).toBe('my-value');
    });
  });

  describe('listIdentifiers', () => {
    it('should list all stored identifiers', () => {
      compressor.storeContent('key1', 'val1');
      compressor.storeContent('key2', 'val2');
      expect(compressor.listIdentifiers()).toEqual(['key1', 'key2']);
    });
  });

  describe('eviction', () => {
    it('should evict entries when exceeding max bytes', () => {
      const bigContent = 'x'.repeat(1024 * 1024); // 1MB each
      for (let i = 0; i < 15; i++) {
        compressor.storeContent(`key${i}`, bigContent);
      }

      compressor.evict(5 * 1024 * 1024); // 5MB max
      expect(compressor.storeSize()).toBeLessThanOrEqual(5 * 1024 * 1024);
    });
  });

  describe('clear', () => {
    it('should clear the entire store', () => {
      compressor.storeContent('a', 'b');
      compressor.storeContent('c', 'd');
      compressor.clear();
      expect(compressor.size).toBe(0);
    });
  });

  describe('singleton', () => {
    beforeEach(() => resetRestorableCompressor());

    it('should return same instance', () => {
      expect(getRestorableCompressor()).toBe(getRestorableCompressor());
    });

    it('should reset singleton', () => {
      const a = getRestorableCompressor();
      resetRestorableCompressor();
      expect(getRestorableCompressor()).not.toBe(a);
    });
  });
});
