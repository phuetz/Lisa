/**
 * Tests for Typed Context Tags (Item 1.3 from cross-project plan)
 *
 * Validates the context tag system: wrapping, stripping, parsing,
 * auto-tagging in addEntry(), convenience methods, and buildTaggedContext().
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContextManager,
  ContextTag,
  ALL_CONTEXT_TAGS,
  wrapWithTag,
  stripTags,
  parseTaggedContent,
  getDefaultTagForEntryType,
  resetContextManager,
} from '../ContextManager';
import { resetObservationVariator } from '../ObservationVariator';
import type { ParsedTaggedContent } from '../ContextManager';

describe('Typed Context Tags', () => {
  const SESSION = 'test-session';

  beforeEach(() => {
    resetContextManager();
    resetObservationVariator();
  });

  // ========================================================================
  // ContextTag enum / constant
  // ========================================================================

  describe('ContextTag', () => {
    it('should have all 10 required tag values', () => {
      expect(ContextTag.KNOWLEDGE).toBe('knowledge');
      expect(ContextTag.LESSONS_CONTEXT).toBe('lessons_context');
      expect(ContextTag.TODO_CONTEXT).toBe('todo_context');
      expect(ContextTag.MEMORY_CONTEXT).toBe('memory_context');
      expect(ContextTag.FILE_CONTENT).toBe('file_content');
      expect(ContextTag.TOOL_RESULT).toBe('tool_result');
      expect(ContextTag.REASONING_GUIDANCE).toBe('reasoning_guidance');
      expect(ContextTag.USER_PREFERENCES).toBe('user_preferences');
      expect(ContextTag.CODEBASE_CONTEXT).toBe('codebase_context');
      expect(ContextTag.WEB_CONTENT).toBe('web_content');
    });

    it('ALL_CONTEXT_TAGS should contain all tag values', () => {
      expect(ALL_CONTEXT_TAGS).toHaveLength(10);
      expect(ALL_CONTEXT_TAGS).toContain('knowledge');
      expect(ALL_CONTEXT_TAGS).toContain('tool_result');
      expect(ALL_CONTEXT_TAGS).toContain('web_content');
    });
  });

  // ========================================================================
  // wrapWithTag()
  // ========================================================================

  describe('wrapWithTag()', () => {
    it('should wrap content with opening and closing tags', () => {
      const result = wrapWithTag(ContextTag.KNOWLEDGE, 'TypeScript is great');
      expect(result).toBe('<knowledge>\nTypeScript is great\n</knowledge>');
    });

    it('should include metadata attributes on the opening tag', () => {
      const result = wrapWithTag(ContextTag.FILE_CONTENT, 'const x = 1;', {
        file: 'app.ts',
        language: 'typescript',
      });
      expect(result).toBe(
        '<file_content file="app.ts" language="typescript">\nconst x = 1;\n</file_content>'
      );
    });

    it('should escape double quotes in attribute values', () => {
      const result = wrapWithTag(ContextTag.TOOL_RESULT, 'output', {
        query: 'say "hello"',
      });
      expect(result).toContain('query="say &quot;hello&quot;"');
    });

    it('should return empty string for empty content', () => {
      expect(wrapWithTag(ContextTag.KNOWLEDGE, '')).toBe('');
    });

    it('should work without metadata', () => {
      const result = wrapWithTag(ContextTag.LESSONS_CONTEXT, 'lesson 1');
      expect(result).toBe('<lessons_context>\nlesson 1\n</lessons_context>');
    });

    it('should handle multiline content', () => {
      const content = 'line 1\nline 2\nline 3';
      const result = wrapWithTag(ContextTag.MEMORY_CONTEXT, content);
      expect(result).toBe('<memory_context>\nline 1\nline 2\nline 3\n</memory_context>');
    });
  });

  // ========================================================================
  // stripTags()
  // ========================================================================

  describe('stripTags()', () => {
    it('should remove context tags and leave inner content', () => {
      const tagged = '<knowledge>\nTypeScript is great\n</knowledge>';
      expect(stripTags(tagged)).toBe('TypeScript is great');
    });

    it('should strip tags with attributes', () => {
      const tagged = '<file_content file="app.ts">\nconst x = 1;\n</file_content>';
      expect(stripTags(tagged)).toBe('const x = 1;');
    });

    it('should strip multiple different tags', () => {
      const text =
        '<knowledge>\nfact 1\n</knowledge>\n\n<lessons_context>\nlesson 1\n</lessons_context>';
      const stripped = stripTags(text);
      expect(stripped).toBe('fact 1\n\nlesson 1');
    });

    it('should return empty string for empty input', () => {
      expect(stripTags('')).toBe('');
    });

    it('should leave non-tagged content unchanged', () => {
      const plain = 'Hello, no tags here.';
      expect(stripTags(plain)).toBe(plain);
    });

    it('should not strip unknown/non-context tags', () => {
      const text = '<div>hello</div>';
      expect(stripTags(text)).toBe('<div>hello</div>');
    });
  });

  // ========================================================================
  // parseTaggedContent()
  // ========================================================================

  describe('parseTaggedContent()', () => {
    it('should parse a single tagged section', () => {
      const text = '<knowledge>\nTypeScript is great\n</knowledge>';
      const result = parseTaggedContent(text);

      expect(result).toHaveLength(1);
      expect(result[0].tag).toBe('knowledge');
      expect(result[0].content).toBe('TypeScript is great');
      expect(result[0].metadata).toBeUndefined();
    });

    it('should parse metadata attributes', () => {
      const text = '<file_content file="app.ts" language="typescript">\nconst x = 1;\n</file_content>';
      const result = parseTaggedContent(text);

      expect(result).toHaveLength(1);
      expect(result[0].tag).toBe('file_content');
      expect(result[0].content).toBe('const x = 1;');
      expect(result[0].metadata).toEqual({
        file: 'app.ts',
        language: 'typescript',
      });
    });

    it('should parse multiple tagged sections', () => {
      const text = [
        '<knowledge>\nfact about TS\n</knowledge>',
        'some untagged text',
        '<tool_result tool="search">\nresult data\n</tool_result>',
      ].join('\n');

      const result = parseTaggedContent(text);

      expect(result).toHaveLength(2);
      expect(result[0].tag).toBe('knowledge');
      expect(result[0].content).toBe('fact about TS');
      expect(result[1].tag).toBe('tool_result');
      expect(result[1].content).toBe('result data');
      expect(result[1].metadata).toEqual({ tool: 'search' });
    });

    it('should unescape &quot; in attribute values', () => {
      const text = '<tool_result query="say &quot;hi&quot;">\noutput\n</tool_result>';
      const result = parseTaggedContent(text);

      expect(result).toHaveLength(1);
      expect(result[0].metadata?.query).toBe('say "hi"');
    });

    it('should return empty array for text with no tags', () => {
      expect(parseTaggedContent('no tags here')).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      expect(parseTaggedContent('')).toEqual([]);
    });

    it('should handle multiline content inside tags', () => {
      const text = '<reasoning_guidance>\nstep 1\nstep 2\nstep 3\n</reasoning_guidance>';
      const result = parseTaggedContent(text);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('step 1\nstep 2\nstep 3');
    });

    it('should roundtrip with wrapWithTag', () => {
      const original = 'some knowledge content';
      const meta = { source: 'docs', version: '2.0' };
      const wrapped = wrapWithTag(ContextTag.KNOWLEDGE, original, meta);
      const parsed = parseTaggedContent(wrapped);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].tag).toBe('knowledge');
      expect(parsed[0].content).toBe(original);
      expect(parsed[0].metadata).toEqual(meta);
    });
  });

  // ========================================================================
  // getDefaultTagForEntryType()
  // ========================================================================

  describe('getDefaultTagForEntryType()', () => {
    it('should return TOOL_RESULT for tool_result entries', () => {
      expect(getDefaultTagForEntryType('tool_result')).toBe(ContextTag.TOOL_RESULT);
    });

    it('should return FILE_CONTENT for file_content entries', () => {
      expect(getDefaultTagForEntryType('file_content')).toBe(ContextTag.FILE_CONTENT);
    });

    it('should return WEB_CONTENT for web_content entries', () => {
      expect(getDefaultTagForEntryType('web_content')).toBe(ContextTag.WEB_CONTENT);
    });

    it('should return MEMORY_CONTEXT for memory entries', () => {
      expect(getDefaultTagForEntryType('memory')).toBe(ContextTag.MEMORY_CONTEXT);
    });

    it('should return undefined for message entries', () => {
      expect(getDefaultTagForEntryType('message')).toBeUndefined();
    });

    it('should return undefined for system_prompt entries', () => {
      expect(getDefaultTagForEntryType('system_prompt')).toBeUndefined();
    });

    it('should return undefined for summary entries', () => {
      expect(getDefaultTagForEntryType('summary')).toBeUndefined();
    });
  });

  // ========================================================================
  // Auto-tagging in addEntry()
  // ========================================================================

  describe('Auto-tagging in addEntry()', () => {
    let manager: ContextManager;

    beforeEach(() => {
      manager = new ContextManager();
      manager.createWindow(SESSION);
    });

    it('should auto-tag tool_result entries', () => {
      const entry = manager.addToolResult(SESSION, 'tool-1', 'search results', 'web_search');

      expect(entry.taggedContent).toBeDefined();
      expect(entry.taggedContent).toContain('<tool_result');
      expect(entry.taggedContent).toContain('</tool_result>');
      expect(entry.taggedContent).toContain('tool="web_search"');
    });

    it('should auto-tag file_content entries', () => {
      const entry = manager.addFileContent(SESSION, 'app.ts', 'const x = 1;');

      expect(entry.taggedContent).toBeDefined();
      expect(entry.taggedContent).toContain('<file_content');
      expect(entry.taggedContent).toContain('file="app.ts"');
      expect(entry.taggedContent).toContain('</file_content>');
    });

    it('should auto-tag web_content entries', () => {
      const entry = manager.addWebContent(SESSION, 'https://example.com', 'page content');

      expect(entry.taggedContent).toBeDefined();
      expect(entry.taggedContent).toContain('<web_content');
      expect(entry.taggedContent).toContain('url="https://example.com"');
      expect(entry.taggedContent).toContain('</web_content>');
    });

    it('should auto-tag memory entries with memory_context', () => {
      const entry = manager.addMemory(SESSION, 'user likes TypeScript', 'pref-1');

      expect(entry.taggedContent).toBeDefined();
      expect(entry.taggedContent).toContain('<memory_context');
      expect(entry.taggedContent).toContain('</memory_context>');
      expect(entry.taggedContent).toContain('source="pref-1"');
    });

    it('should NOT auto-tag message entries', () => {
      const entry = manager.addMessage(SESSION, 'user', 'Hello Lisa!');

      expect(entry.taggedContent).toBeUndefined();
    });

    it('should NOT auto-tag system_prompt entries (without explicit tag)', () => {
      const entry = manager.addEntry(SESSION, {
        type: 'system_prompt',
        content: 'You are Lisa.',
        role: 'system',
        tokens: 10,
      });

      expect(entry.taggedContent).toBeUndefined();
    });

    it('should use explicit contextTag override from metadata', () => {
      const entry = manager.addEntry(SESSION, {
        type: 'memory',
        content: 'Always use French',
        role: 'system',
        tokens: 10,
        metadata: { contextTag: ContextTag.USER_PREFERENCES },
      });

      expect(entry.taggedContent).toBeDefined();
      expect(entry.taggedContent).toContain('<user_preferences>');
      expect(entry.taggedContent).toContain('</user_preferences>');
    });

    it('should preserve raw content alongside tagged content', () => {
      const entry = manager.addFileContent(SESSION, 'index.ts', 'export {};');

      expect(entry.content).toBe('export {};');
      expect(entry.taggedContent).toContain('export {};');
      expect(entry.taggedContent).toContain('<file_content');
    });
  });

  // ========================================================================
  // Convenience methods for tagged context injection
  // ========================================================================

  describe('Convenience methods', () => {
    let manager: ContextManager;

    beforeEach(() => {
      manager = new ContextManager();
      manager.createWindow(SESSION);
    });

    it('addKnowledge() should tag with KNOWLEDGE', () => {
      const entry = manager.addKnowledge(SESSION, 'React uses JSX', 'docs');

      expect(entry.taggedContent).toContain('<knowledge');
      expect(entry.taggedContent).toContain('source="docs"');
      expect(entry.taggedContent).toContain('</knowledge>');
      expect(entry.metadata?.contextTag).toBe(ContextTag.KNOWLEDGE);
    });

    it('addLessons() should tag with LESSONS_CONTEXT', () => {
      const entry = manager.addLessons(SESSION, 'PATTERN: always validate inputs');

      expect(entry.taggedContent).toContain('<lessons_context>');
      expect(entry.taggedContent).toContain('</lessons_context>');
      expect(entry.metadata?.contextTag).toBe(ContextTag.LESSONS_CONTEXT);
    });

    it('addReasoningGuidance() should tag with REASONING_GUIDANCE', () => {
      const entry = manager.addReasoningGuidance(SESSION, 'Think step by step');

      expect(entry.taggedContent).toContain('<reasoning_guidance>');
      expect(entry.taggedContent).toContain('</reasoning_guidance>');
      expect(entry.metadata?.contextTag).toBe(ContextTag.REASONING_GUIDANCE);
    });

    it('addUserPreferences() should tag with USER_PREFERENCES', () => {
      const entry = manager.addUserPreferences(SESSION, 'Preferred language: French');

      expect(entry.taggedContent).toContain('<user_preferences>');
      expect(entry.taggedContent).toContain('</user_preferences>');
      expect(entry.metadata?.contextTag).toBe(ContextTag.USER_PREFERENCES);
    });

    it('addCodebaseContext() should tag with CODEBASE_CONTEXT', () => {
      const entry = manager.addCodebaseContext(SESSION, 'Project uses Vite + React', 'analyzer');

      expect(entry.taggedContent).toContain('<codebase_context');
      expect(entry.taggedContent).toContain('source="analyzer"');
      expect(entry.taggedContent).toContain('</codebase_context>');
      expect(entry.metadata?.contextTag).toBe(ContextTag.CODEBASE_CONTEXT);
    });
  });

  // ========================================================================
  // buildTaggedContext()
  // ========================================================================

  describe('buildTaggedContext()', () => {
    let manager: ContextManager;

    beforeEach(() => {
      manager = new ContextManager();
      manager.createWindow(SESSION);
    });

    it('should return tagged content strings for tagged entries', () => {
      manager.addKnowledge(SESSION, 'fact 1');
      manager.addFileContent(SESSION, 'app.ts', 'code here');

      const tagged = manager.buildTaggedContext(SESSION);

      // At least the pinned system prompt (untagged) + knowledge + file_content
      const knowledgeEntries = tagged.filter(s => s.includes('<knowledge>'));
      const fileEntries = tagged.filter(s => s.includes('<file_content'));

      expect(knowledgeEntries.length).toBeGreaterThanOrEqual(1);
      expect(fileEntries.length).toBeGreaterThanOrEqual(1);
    });

    it('should fall back to raw content for untagged entries', () => {
      manager.addMessage(SESSION, 'user', 'Hello!');

      const tagged = manager.buildTaggedContext(SESSION);

      // The message entry should appear as raw content (no tags)
      const hasHello = tagged.some(s => s.includes('Hello!'));
      expect(hasHello).toBe(true);

      // It should NOT have context tags around it
      const hasTaggedHello = tagged.some(
        s => s.includes('Hello!') && s.includes('<message')
      );
      expect(hasTaggedHello).toBe(false);
    });

    it('should return empty array for non-existent session', () => {
      expect(manager.buildTaggedContext('nonexistent')).toEqual([]);
    });
  });

  // ========================================================================
  // Integration: roundtrip parse of buildTaggedContext output
  // ========================================================================

  describe('Integration: roundtrip', () => {
    it('should produce parseable tagged output from addEntry through buildTaggedContext', () => {
      const manager = new ContextManager();
      manager.createWindow(SESSION);

      manager.addKnowledge(SESSION, 'TypeScript is a typed superset of JavaScript', 'mdn');
      manager.addLessons(SESSION, 'RULE: always handle errors gracefully');
      manager.addFileContent(SESSION, 'utils.ts', 'export function add(a: number, b: number) { return a + b; }');

      const taggedStrings = manager.buildTaggedContext(SESSION);
      const fullText = taggedStrings.join('\n\n');

      const parsed = parseTaggedContent(fullText);

      // We expect at least 3 tagged sections (knowledge, lessons_context, file_content)
      const tags = parsed.map(p => p.tag);
      expect(tags).toContain('knowledge');
      expect(tags).toContain('lessons_context');
      expect(tags).toContain('file_content');

      // Verify knowledge section
      const knowledgeSection = parsed.find(p => p.tag === 'knowledge') as ParsedTaggedContent;
      expect(knowledgeSection.content).toBe('TypeScript is a typed superset of JavaScript');
      expect(knowledgeSection.metadata?.source).toBe('mdn');

      // Verify file_content section
      const fileSection = parsed.find(p => p.tag === 'file_content') as ParsedTaggedContent;
      expect(fileSection.content).toContain('export function add');
      expect(fileSection.metadata?.file).toBe('utils.ts');
    });

    it('stripped tagged content should equal original content', () => {
      const original = 'some important fact';
      const tagged = wrapWithTag(ContextTag.KNOWLEDGE, original, { source: 'test' });
      const stripped = stripTags(tagged);

      expect(stripped).toBe(original);
    });
  });
});
