import { execFileSync } from 'child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentDomains } from '../core/types';
import { GitNexusAgent, type GitNexusAction } from '../implementations/GitNexusAgent';

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

const EXEC_OPTIONS = {
  encoding: 'utf8',
  timeout: 30_000,
  maxBuffer: 5 * 1024 * 1024,
};

const REPO_PATH = 'D:\\repos\\sample';

type ActionCase = {
  action: GitNexusAction;
  parameters: Record<string, string>;
  expectedArgs: string[];
};

const actionCases: ActionCase[] = [
  {
    action: 'query',
    parameters: {
      repoPath: REPO_PATH,
      q: 'find authentication flow',
    },
    expectedArgs: ['query', '--path', REPO_PATH, '--q', 'find authentication flow'],
  },
  {
    action: 'search_code',
    parameters: {
      repoPath: REPO_PATH,
      q: 'AuthService',
    },
    expectedArgs: ['search', '--path', REPO_PATH, '--q', 'AuthService'],
  },
  {
    action: 'context',
    parameters: {
      repoPath: REPO_PATH,
      symbol: 'AuthService.login',
    },
    expectedArgs: ['context', '--path', REPO_PATH, '--symbol', 'AuthService.login'],
  },
  {
    action: 'impact',
    parameters: {
      repoPath: REPO_PATH,
      target: 'src/services/AuthService.ts',
    },
    expectedArgs: ['impact', '--path', REPO_PATH, '--target', 'src/services/AuthService.ts'],
  },
  {
    action: 'diagram',
    parameters: {
      repoPath: REPO_PATH,
      symbol: 'AuthService.login',
    },
    expectedArgs: ['diagram', '--path', REPO_PATH, '--symbol', 'AuthService.login'],
  },
];

describe('GitNexusAgent', () => {
  let agent: GitNexusAgent;
  const execFileSyncMock = vi.mocked(execFileSync);

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new GitNexusAgent();
  });

  it('exposes the expected base agent metadata', () => {
    expect(agent.name).toBe('GitNexusAgent');
    expect(agent.version).toBe('1.0.0');
    expect(agent.domain).toBe(AgentDomains.KNOWLEDGE);
    expect(agent.capabilities).toHaveLength(5);
  });

  describe.each(actionCases)('$action', ({ action, parameters, expectedArgs }) => {
    it('returns CLI output on success', async () => {
      execFileSyncMock.mockReturnValue(`result for ${action}`);

      const result = await agent.execute({
        action,
        parameters,
      });

      expect(execFileSyncMock).toHaveBeenCalledOnce();
      expect(execFileSyncMock).toHaveBeenCalledWith('gitnexus', expectedArgs, EXEC_OPTIONS);
      expect(result.success).toBe(true);
      expect(result.output).toBe(`result for ${action}`);
      expect(result.error).toBeUndefined();
      expect(result.metadata).toMatchObject({
        source: 'GitNexus',
      });
      expect(result.metadata?.executionTime).toEqual(expect.any(Number));
      expect(result.metadata?.timestamp).toEqual(expect.any(Number));
    });

    it('fails fast when repoPath is missing', async () => {
      const { repoPath: _repoPath, ...parametersWithoutRepoPath } = parameters;

      const result = await agent.execute({
        action,
        parameters: parametersWithoutRepoPath,
      });

      expect(execFileSyncMock).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        output: null,
        error: 'repoPath parameter is required',
      });
    });

    it('returns CLI errors when the gitnexus command fails', async () => {
      execFileSyncMock.mockImplementation(() => {
        throw new Error(`${action} failed`);
      });

      const result = await agent.execute({
        action,
        parameters,
      });

      expect(execFileSyncMock).toHaveBeenCalledOnce();
      expect(result.success).toBe(false);
      expect(result.output).toBeNull();
      expect(result.error).toBe(`${action} failed`);
      expect(result.metadata?.executionTime).toEqual(expect.any(Number));
    });
  });
});
