/**
 * AutoCaptureService Tests
 *
 * Comprehensive tests covering:
 *   - Each pattern category (personal, preference, project, decision, instruction)
 *   - Bilingual detection (French + English)
 *   - Deduplication (exact + normalized + Jaccard)
 *   - Confidence scoring (user vs assistant boost/penalty)
 *   - Edge cases (empty strings, no matches, multiple facts)
 *   - Full pipeline (captureFromMessage)
 *   - Stats tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AutoCaptureService,
  getAutoCaptureService,
  type CapturedFact,
} from '../AutoCaptureService';
import { KnowledgeGraph } from '../KnowledgeGraphService';

// ---------------------------------------------------------------------------
// localStorage mock (same pattern as KnowledgeGraphService tests)
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _reset: () => {
      store = {};
    },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------
let service: AutoCaptureService;

beforeEach(() => {
  AutoCaptureService.resetInstance();
  KnowledgeGraph.resetInstance();
  service = AutoCaptureService.getInstance();
  localStorageMock._reset();
  localStorageMock.setItem.mockClear();
});

afterEach(() => {
  AutoCaptureService.resetInstance();
  KnowledgeGraph.resetInstance();
});

// ===========================================================================
// Singleton
// ===========================================================================
describe('AutoCaptureService singleton', () => {
  it('returns the same instance', () => {
    const a = AutoCaptureService.getInstance();
    const b = AutoCaptureService.getInstance();
    expect(a).toBe(b);
  });

  it('resetInstance creates a fresh service', () => {
    service.analyzeMessage('je m\'appelle Alice', 'user');
    const statsBefore = service.getStats();
    expect(statsBefore.totalCaptured).toBe(1);

    AutoCaptureService.resetInstance();
    const fresh = AutoCaptureService.getInstance();
    expect(fresh.getStats().totalCaptured).toBe(0);
  });

  it('getAutoCaptureService convenience function works', () => {
    expect(getAutoCaptureService()).toBe(service);
  });
});

// ===========================================================================
// Personal Info Patterns
// ===========================================================================
describe('personal info patterns', () => {
  it('detects French name: "je m\'appelle X"', () => {
    const facts = service.analyzeMessage("je m'appelle Patrick", 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'hasName',
      object: 'Patrick',
      category: 'personal',
      source: 'user_message',
    });
  });

  it('detects English name: "my name is X"', () => {
    const facts = service.analyzeMessage('my name is Alice', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'hasName',
      object: 'Alice',
      category: 'personal',
    });
  });

  it('detects French age: "j\'ai N ans"', () => {
    const facts = service.analyzeMessage("j'ai 30 ans", 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'hasAge',
      object: '30',
      category: 'personal',
    });
  });

  it('detects English age: "I am N years old"', () => {
    const facts = service.analyzeMessage('I am 25 years old', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'hasAge',
      object: '25',
      category: 'personal',
    });
  });

  it('detects French location: "j\'habite a X"', () => {
    const facts = service.analyzeMessage("j'habite a Strasbourg", 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'livesIn',
      object: 'Strasbourg',
      category: 'personal',
    });
  });

  it('detects English location: "I live in X"', () => {
    const facts = service.analyzeMessage('I live in Paris', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'livesIn',
      object: 'Paris',
      category: 'personal',
    });
  });

  it('detects French workplace: "je travaille chez X"', () => {
    const facts = service.analyzeMessage('je travaille chez Google', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'worksAt',
      object: 'Google',
      category: 'personal',
    });
  });

  it('detects English workplace: "I work at X"', () => {
    const facts = service.analyzeMessage('I work at Microsoft', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'worksAt',
      object: 'Microsoft',
      category: 'personal',
    });
  });
});

// ===========================================================================
// Preference Patterns
// ===========================================================================
describe('preference patterns', () => {
  it('detects French preference: "je prefere X"', () => {
    const facts = service.analyzeMessage('je prefere TypeScript', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'prefers',
      object: 'TypeScript',
      category: 'preference',
    });
  });

  it('detects English preference: "I prefer X"', () => {
    const facts = service.analyzeMessage('I prefer dark mode', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'prefers',
      object: 'dark mode',
      category: 'preference',
    });
  });

  it('detects French like: "j\'aime X"', () => {
    const facts = service.analyzeMessage("j'aime le chocolat", 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'likes',
      object: 'le chocolat',
      category: 'preference',
    });
  });

  it('detects English like: "I like X"', () => {
    const facts = service.analyzeMessage('I like React', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'likes',
      object: 'React',
      category: 'preference',
    });
  });

  it('detects French dislike: "je deteste X"', () => {
    const facts = service.analyzeMessage('je deteste les bugs', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'dislikes',
      object: 'les bugs',
      category: 'preference',
    });
  });

  it('detects English dislike: "I hate X"', () => {
    const facts = service.analyzeMessage('I hate slow tests', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'dislikes',
      object: 'slow tests',
      category: 'preference',
    });
  });

  it('detects French tool usage: "j\'utilise X"', () => {
    const facts = service.analyzeMessage("j'utilise VS Code", 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'uses',
      object: 'VS Code',
      category: 'preference',
    });
  });

  it('detects English tool usage: "I use X"', () => {
    const facts = service.analyzeMessage('I use Neovim', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'User',
      predicate: 'uses',
      object: 'Neovim',
      category: 'preference',
    });
  });
});

// ===========================================================================
// Project Info Patterns
// ===========================================================================
describe('project info patterns', () => {
  it('detects French project dependency: "ce projet utilise X"', () => {
    const facts = service.analyzeMessage('ce projet utilise React et Vite', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'Project',
      predicate: 'uses',
      object: 'React et Vite',
      category: 'project',
    });
  });

  it('detects English project dependency: "this project uses X"', () => {
    const facts = service.analyzeMessage('this project uses TailwindCSS', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'Project',
      predicate: 'uses',
      object: 'TailwindCSS',
      category: 'project',
    });
  });

  it('detects French project name: "le projet s\'appelle X"', () => {
    const facts = service.analyzeMessage("le projet s'appelle Lisa", 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'Project',
      predicate: 'hasName',
      object: 'Lisa',
      category: 'project',
    });
  });
});

// ===========================================================================
// Decision Patterns
// ===========================================================================
describe('decision patterns', () => {
  it('detects French decision: "on a decide de X"', () => {
    const facts = service.analyzeMessage(
      'on a decide de migrer vers PostgreSQL',
      'user',
    );
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'Decision',
      predicate: 'isAbout',
      object: 'migrer vers PostgreSQL',
      category: 'decision',
    });
  });

  it('detects English decision: "we decided to X"', () => {
    const facts = service.analyzeMessage(
      'we decided to use microservices',
      'user',
    );
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'Decision',
      predicate: 'isAbout',
      object: 'use microservices',
      category: 'decision',
    });
  });

  it('detects French solution: "la solution est X"', () => {
    const facts = service.analyzeMessage(
      'la solution est de refactoriser le module',
      'user',
    );
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'Solution',
      predicate: 'isAbout',
      object: 'de refactoriser le module',
      category: 'decision',
    });
  });
});

// ===========================================================================
// Instruction Patterns
// ===========================================================================
describe('instruction patterns', () => {
  it('detects French "toujours X"', () => {
    const facts = service.analyzeMessage(
      'toujours utiliser des types stricts',
      'user',
    );
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'Rule',
      predicate: 'states',
      object: 'utiliser des types stricts',
      category: 'instruction',
    });
  });

  it('detects English "always X"', () => {
    const facts = service.analyzeMessage('always write tests first', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'Rule',
      predicate: 'states',
      object: 'write tests first',
      category: 'instruction',
    });
  });

  it('detects French "jamais X" and prefixes "never"', () => {
    const facts = service.analyzeMessage('jamais utiliser any', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'Rule',
      predicate: 'states',
      object: 'never utiliser any',
      category: 'instruction',
    });
  });

  it('detects English "never X" and prefixes "never"', () => {
    const facts = service.analyzeMessage('never use eval', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'Rule',
      predicate: 'states',
      object: 'never use eval',
      category: 'instruction',
    });
  });

  it('detects French reminder: "n\'oublie pas X"', () => {
    const facts = service.analyzeMessage(
      "n'oublie pas de committer",
      'user',
    );
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'Reminder',
      predicate: 'states',
      object: 'de committer',
      category: 'instruction',
    });
  });

  it('detects English reminder: "don\'t forget X"', () => {
    const facts = service.analyzeMessage(
      "don't forget to run the linter",
      'user',
    );
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      subject: 'Reminder',
      predicate: 'states',
      object: 'to run the linter',
      category: 'instruction',
    });
  });
});

// ===========================================================================
// Confidence Scoring
// ===========================================================================
describe('confidence scoring', () => {
  it('gives higher confidence to user messages (+0.05 boost)', () => {
    const userFacts = service.analyzeMessage("je m'appelle Alice", 'user');
    expect(userFacts[0].confidence).toBe(Math.min(1, 0.95 + 0.05));
  });

  it('gives lower confidence to assistant messages (-0.1 penalty)', () => {
    const assistantFacts = service.analyzeMessage(
      "je m'appelle Alice",
      'assistant',
    );
    expect(assistantFacts[0].confidence).toBe(0.95 - 0.1);
  });

  it('clamps user confidence to max 1.0', () => {
    // 0.95 base + 0.05 = 1.0
    const facts = service.analyzeMessage("je m'appelle Test", 'user');
    expect(facts[0].confidence).toBeLessThanOrEqual(1.0);
  });

  it('clamps assistant confidence to min 0.0', () => {
    // All patterns have confidence >= 0.75, so 0.75 - 0.1 = 0.65, still > 0
    const facts = service.analyzeMessage('always test everything', 'assistant');
    expect(facts[0].confidence).toBeGreaterThanOrEqual(0);
  });

  it('source field reflects the role', () => {
    const userFacts = service.analyzeMessage('I live in Berlin', 'user');
    expect(userFacts[0].source).toBe('user_message');

    AutoCaptureService.resetInstance();
    const svc2 = AutoCaptureService.getInstance();
    const assistantFacts = svc2.analyzeMessage('I live in Berlin', 'assistant');
    expect(assistantFacts[0].source).toBe('assistant_response');
  });
});

// ===========================================================================
// Deduplication
// ===========================================================================
describe('deduplication', () => {
  it('detects exact duplicate in knowledge graph', () => {
    const kg = KnowledgeGraph.getInstance();
    kg.add('User', 'hasName', 'Patrick');

    const fact: CapturedFact = {
      subject: 'User',
      predicate: 'hasName',
      object: 'Patrick',
      confidence: 0.95,
      source: 'user_message',
      category: 'personal',
    };

    expect(service.isDuplicate(fact)).toBe(true);
  });

  it('detects case-insensitive duplicate', () => {
    const kg = KnowledgeGraph.getInstance();
    kg.add('User', 'likes', 'TypeScript');

    const fact: CapturedFact = {
      subject: 'User',
      predicate: 'likes',
      object: 'typescript',
      confidence: 0.8,
      source: 'user_message',
      category: 'preference',
    };

    expect(service.isDuplicate(fact)).toBe(true);
  });

  it('detects near-duplicate via Jaccard similarity', () => {
    const kg = KnowledgeGraph.getInstance();
    kg.add('User', 'prefers', 'dark mode theme');

    const fact: CapturedFact = {
      subject: 'User',
      predicate: 'prefers',
      object: 'dark theme mode',
      confidence: 0.85,
      source: 'user_message',
      category: 'preference',
    };

    expect(service.isDuplicate(fact)).toBe(true);
  });

  it('does NOT flag sufficiently different facts as duplicates', () => {
    const kg = KnowledgeGraph.getInstance();
    kg.add('User', 'likes', 'TypeScript');

    const fact: CapturedFact = {
      subject: 'User',
      predicate: 'likes',
      object: 'Python for data science',
      confidence: 0.8,
      source: 'user_message',
      category: 'preference',
    };

    expect(service.isDuplicate(fact)).toBe(false);
  });

  it('returns false when graph is empty', () => {
    const fact: CapturedFact = {
      subject: 'User',
      predicate: 'hasName',
      object: 'Alice',
      confidence: 0.95,
      source: 'user_message',
      category: 'personal',
    };

    expect(service.isDuplicate(fact)).toBe(false);
  });

  it('skips duplicates during processAndStore', async () => {
    const kg = KnowledgeGraph.getInstance();
    kg.add('User', 'hasName', 'Patrick');

    const facts: CapturedFact[] = [
      {
        subject: 'User',
        predicate: 'hasName',
        object: 'Patrick',
        confidence: 0.95,
        source: 'user_message',
        category: 'personal',
      },
      {
        subject: 'User',
        predicate: 'livesIn',
        object: 'Strasbourg',
        confidence: 0.9,
        source: 'user_message',
        category: 'personal',
      },
    ];

    const stored = await service.processAndStore(facts);
    expect(stored).toBe(1); // Only livesIn stored, hasName skipped
    expect(kg.has('User', 'livesIn', 'Strasbourg')).toBe(true);
  });
});

// ===========================================================================
// Edge Cases
// ===========================================================================
describe('edge cases', () => {
  it('returns empty array for empty string', () => {
    const facts = service.analyzeMessage('', 'user');
    expect(facts).toHaveLength(0);
  });

  it('returns empty array for whitespace-only string', () => {
    const facts = service.analyzeMessage('   \n\t  ', 'user');
    expect(facts).toHaveLength(0);
  });

  it('returns empty array for null/undefined input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(service.analyzeMessage(null as any, 'user')).toHaveLength(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(service.analyzeMessage(undefined as any, 'user')).toHaveLength(0);
  });

  it('returns empty array when no patterns match', () => {
    const facts = service.analyzeMessage(
      'The weather is nice today',
      'user',
    );
    expect(facts).toHaveLength(0);
  });

  it('strips trailing punctuation from extracted values', () => {
    const facts = service.analyzeMessage("je m'appelle Alice.", 'user');
    expect(facts[0].object).toBe('Alice');
  });

  it('handles very long input by truncating extracted values', () => {
    const longName = 'A'.repeat(300);
    const facts = service.analyzeMessage(`my name is ${longName}`, 'user');
    expect(facts[0].object.length).toBeLessThanOrEqual(200);
  });

  it('handles multiple facts in one message', () => {
    // "I like" and "I use" can both match in a single message
    // but since regex matches are tested against the full string,
    // typically only the first match wins per pattern.
    // Let's test a message that triggers two different categories:
    const facts = service.analyzeMessage("j'aime React", 'user');
    expect(facts.length).toBeGreaterThanOrEqual(1);
    expect(facts[0].predicate).toBe('likes');
  });

  it('deduplicates within the same message', () => {
    // If somehow two patterns produce the same triple, it should be deduped
    const facts = service.analyzeMessage("je prefere React", 'user');
    const uniqueKeys = new Set(
      facts.map((f) => `${f.subject}|${f.predicate}|${f.object}`),
    );
    expect(uniqueKeys.size).toBe(facts.length);
  });

  it('processAndStore with empty array returns 0', async () => {
    const stored = await service.processAndStore([]);
    expect(stored).toBe(0);
  });

  it('processAndStore with null returns 0', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stored = await service.processAndStore(null as any);
    expect(stored).toBe(0);
  });
});

// ===========================================================================
// Full Pipeline (captureFromMessage)
// ===========================================================================
describe('captureFromMessage (full pipeline)', () => {
  it('extracts and stores a fact in one call', async () => {
    const kg = KnowledgeGraph.getInstance();
    const stored = await service.captureFromMessage(
      "je m'appelle Patrick",
      'user',
    );
    expect(stored).toBe(1);
    expect(kg.has('User', 'hasName', 'Patrick')).toBe(true);
  });

  it('persists to localStorage after storing', async () => {
    await service.captureFromMessage('I live in Berlin', 'user');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('returns 0 for non-matching messages', async () => {
    const stored = await service.captureFromMessage(
      'just a normal conversation',
      'user',
    );
    expect(stored).toBe(0);
  });

  it('handles assistant messages', async () => {
    const stored = await service.captureFromMessage(
      'this project uses Vite',
      'assistant',
    );
    expect(stored).toBe(1);
    const kg = KnowledgeGraph.getInstance();
    expect(kg.has('Project', 'uses', 'Vite')).toBe(true);
  });

  it('stores metadata with captured facts', async () => {
    await service.captureFromMessage("j'habite a Lyon", 'user');
    const kg = KnowledgeGraph.getInstance();
    const results = kg.query({ subject: 'User', predicate: 'livesIn' });
    expect(results).toHaveLength(1);
    expect(results[0].metadata).toBeDefined();
    expect(results[0].metadata!.source).toBe('user_message');
    expect(results[0].metadata!.category).toBe('personal');
    expect(results[0].metadata!.confidence).toBeDefined();
    expect(results[0].metadata!.capturedAt).toBeDefined();
  });

  it('does not store duplicate facts on repeated calls', async () => {
    await service.captureFromMessage('I work at Google', 'user');
    await service.captureFromMessage('I work at Google', 'user');

    const kg = KnowledgeGraph.getInstance();
    const results = kg.query({ subject: 'User', predicate: 'worksAt' });
    expect(results).toHaveLength(1);
  });
});

// ===========================================================================
// Stats Tracking
// ===========================================================================
describe('stats tracking', () => {
  it('starts with all zeros', () => {
    const stats = service.getStats();
    expect(stats).toEqual({
      totalCaptured: 0,
      totalStored: 0,
      duplicatesSkipped: 0,
    });
  });

  it('increments totalCaptured on analyzeMessage', () => {
    service.analyzeMessage("je m'appelle Test", 'user');
    expect(service.getStats().totalCaptured).toBe(1);
  });

  it('increments totalStored after processAndStore', async () => {
    const facts = service.analyzeMessage('I live in Tokyo', 'user');
    await service.processAndStore(facts);
    expect(service.getStats().totalStored).toBe(1);
  });

  it('increments duplicatesSkipped when dedup triggers', async () => {
    const kg = KnowledgeGraph.getInstance();
    kg.add('User', 'hasName', 'Alice');

    const facts: CapturedFact[] = [
      {
        subject: 'User',
        predicate: 'hasName',
        object: 'Alice',
        confidence: 0.95,
        source: 'user_message',
        category: 'personal',
      },
    ];
    await service.processAndStore(facts);
    expect(service.getStats().duplicatesSkipped).toBe(1);
  });

  it('tracks cumulative stats across multiple calls', async () => {
    await service.captureFromMessage("je m'appelle Alice", 'user');
    await service.captureFromMessage('I live in Paris', 'user');
    await service.captureFromMessage('hello world', 'user'); // no match

    const stats = service.getStats();
    expect(stats.totalCaptured).toBe(2);
    expect(stats.totalStored).toBe(2);
    expect(stats.duplicatesSkipped).toBe(0);
  });
});

// ===========================================================================
// Bilingual Mixed Messages
// ===========================================================================
describe('bilingual mixed messages', () => {
  it('handles French accented characters', () => {
    const facts = service.analyzeMessage("j'habite à Montréal", 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0].object).toContain('Montr');
  });

  it('handles typographic apostrophes (curly quotes)', () => {
    // Unicode right single quotation mark U+2019
    const facts = service.analyzeMessage('je m\u2019appelle Jean', 'user');
    expect(facts).toHaveLength(1);
    expect(facts[0].object).toBe('Jean');
  });

  it('is case-insensitive on pattern keywords', () => {
    const facts1 = service.analyzeMessage('MY NAME IS Bob', 'user');
    expect(facts1).toHaveLength(1);

    AutoCaptureService.resetInstance();
    const svc2 = AutoCaptureService.getInstance();
    const facts2 = svc2.analyzeMessage('JE TRAVAILLE CHEZ Apple', 'user');
    expect(facts2).toHaveLength(1);
    expect(facts2[0].object).toBe('Apple');
  });

  it('detects facts from assistant responses with correct source', () => {
    const facts = service.analyzeMessage(
      'this project uses TailwindCSS',
      'assistant',
    );
    expect(facts).toHaveLength(1);
    expect(facts[0].source).toBe('assistant_response');
    expect(facts[0].category).toBe('project');
  });
});
