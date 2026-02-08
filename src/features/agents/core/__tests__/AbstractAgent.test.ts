import { describe, it, expect, vi } from 'vitest';
import { AbstractAgent } from '../AbstractAgent';
import type { AgentExecuteProps, AgentExecuteResult } from '../types';
import { z } from 'zod';

// Concrete test implementation
class TestAgent extends AbstractAgent {
  name = 'TestAgent';
  description = 'A test agent';
  version = '1.0.0';
  domain = 'knowledge' as const;
  capabilities = ['test', 'demo'];

  protected async run(
    intent: string,
    parameters: Record<string, any>,
  ): Promise<any> {
    if (intent === 'greet') return { greeting: `Hello, ${parameters.name}` };
    if (intent === 'fail') throw new Error('intentional failure');
    return { intent, parameters };
  }
}

class ValidatingAgent extends AbstractAgent {
  name = 'ValidatingAgent';
  description = 'Agent with validation';
  version = '1.0.0';
  domain = 'analysis' as const;
  capabilities = ['validate'];

  protected override get keywords() {
    return ['validate', 'check'];
  }
  protected override get regexPatterns() {
    return [/^run validation$/];
  }

  override async validateInput(props: AgentExecuteProps) {
    if (!props.parameters?.text) {
      return { valid: false, errors: ['text parameter is required'] };
    }
    return { valid: true };
  }

  protected async run(
    _intent: string,
    parameters: Record<string, any>,
  ) {
    return { validated: parameters.text };
  }
}

class SchemaAgent extends AbstractAgent {
  name = 'SchemaAgent';
  description = 'Agent with Zod config schema';
  version = '1.0.0';
  domain = 'productivity' as const;
  capabilities = ['schema'];
  configSchema = z.object({
    url: z.string().describe('The target URL'),
    retries: z.number().optional().describe('Retry count'),
    verbose: z.boolean().describe('Verbose output'),
  });

  protected async run() {
    return {};
  }
}

describe('AbstractAgent', () => {
  const agent = new TestAgent();

  it('returns success with output and metadata', async () => {
    const result = await agent.execute({
      intent: 'greet',
      parameters: { name: 'Lisa' },
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ greeting: 'Hello, Lisa' });
    expect(result.metadata).toBeDefined();
    expect(result.metadata!.source).toBe('TestAgent');
    expect(typeof result.metadata!.executionTime).toBe('number');
    expect(typeof result.metadata!.timestamp).toBe('number');
  });

  it('wraps thrown errors into failure result', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await agent.execute({ intent: 'fail' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('intentional failure');
    expect(result.output).toBeNull();
    expect(result.metadata!.source).toBe('TestAgent');
    consoleSpy.mockRestore();
  });

  it('passes intent from props.command when intent is absent', async () => {
    const result = await agent.execute({ command: 'echo', parameters: { a: 1 } });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ intent: 'echo', parameters: { a: 1 } });
  });

  it('defaults intent and parameters to empty', async () => {
    const result = await agent.execute({});

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ intent: '', parameters: {} });
  });

  it('getCapabilities auto-generates from capabilities array', async () => {
    const caps = await agent.getCapabilities();

    expect(caps).toHaveLength(2);
    expect(caps[0].name).toBe('test');
    expect(caps[0].description).toContain('TestAgent');
    expect(caps[1].name).toBe('demo');
  });
});

describe('AbstractAgent validation', () => {
  const agent = new ValidatingAgent();

  it('rejects when validation fails', async () => {
    const result = await agent.execute({ intent: 'validate', parameters: {} });

    expect(result.success).toBe(false);
    expect(result.error).toContain('text parameter is required');
  });

  it('succeeds when validation passes', async () => {
    const result = await agent.execute({
      intent: 'validate',
      parameters: { text: 'hello' },
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ validated: 'hello' });
  });
});

describe('AbstractAgent canHandle', () => {
  const agent = new ValidatingAgent();

  it('returns 0.85 for regex match', async () => {
    expect(await agent.canHandle('run validation')).toBe(0.85);
  });

  it('returns 0.65 for keyword match', async () => {
    expect(await agent.canHandle('please validate this')).toBe(0.65);
    expect(await agent.canHandle('check the data')).toBe(0.65);
  });

  it('returns 0 for no match', async () => {
    expect(await agent.canHandle('make coffee')).toBe(0);
  });

  it('is case-insensitive', async () => {
    expect(await agent.canHandle('VALIDATE')).toBe(0.65);
  });
});

describe('AbstractAgent parametersFromSchema', () => {
  const agent = new SchemaAgent();

  it('generates parameters from configSchema via getRequiredParameters', async () => {
    const params = await agent.getRequiredParameters('any');

    expect(params).toHaveLength(3);

    const url = params.find((p) => p.name === 'url')!;
    expect(url.type).toBe('string');
    expect(url.required).toBe(true);
    expect(url.description).toBe('The target URL');

    const retries = params.find((p) => p.name === 'retries')!;
    expect(retries.type).toBe('number');
    expect(retries.required).toBe(false);

    const verbose = params.find((p) => p.name === 'verbose')!;
    expect(verbose.type).toBe('boolean');
    expect(verbose.required).toBe(true);
  });

  it('returns empty array when no configSchema', async () => {
    const plain = new TestAgent();
    const params = await plain.getRequiredParameters('any');
    expect(params).toEqual([]);
  });
});
