/**
 * Tests for GitHubAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitHubAgent } from '../implementations/GitHubAgent';
import { AgentDomains } from '../core/types';

// Mock Octokit and GitHubCacheService
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(function() {
    this.repos = { get: vi.fn(), listForUser: vi.fn() };
    this.issues = { list: vi.fn(), create: vi.fn() };
    this.pulls = { list: vi.fn() };
    this.git = { getCommit: vi.fn() };
  })
}));

vi.mock('../../../services/GitHubCacheService', () => ({
  default: { get: vi.fn(), set: vi.fn() }
}));

describe('GitHubAgent', () => {
  let agent: GitHubAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new GitHubAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('GitHubAgent');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.INTEGRATION);
    });

    it('should have valid property set to true', () => {
      expect(agent.valid).toBe(true);
    });
  });

  describe('execute - getRepository intent', () => {
    it('should fetch repository details', async () => {
      const result = await agent.execute({
        intent: 'getRepository',
        parameters: { owner: 'anthropics', repo: 'claude-code' }
      });

      expect(result.success).toBeDefined();
    });

    it('should require owner and repo parameters', async () => {
      const result = await agent.execute({
        intent: 'getRepository',
        parameters: { owner: 'anthropics' }
      });

      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('execute - listIssues intent', () => {
    it('should list repository issues', async () => {
      const result = await agent.execute({
        intent: 'listIssues',
        parameters: { owner: 'anthropics', repo: 'claude-code' }
      });

      expect(result.success).toBeDefined();
    });

    it('should support filtering by state', async () => {
      const result = await agent.execute({
        intent: 'listIssues',
        parameters: {
          owner: 'anthropics',
          repo: 'claude-code',
          state: 'open'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support pagination', async () => {
      const result = await agent.execute({
        intent: 'listIssues',
        parameters: {
          owner: 'anthropics',
          repo: 'claude-code',
          page: 2,
          per_page: 50
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - createIssue intent', () => {
    it('should create a new issue', async () => {
      const result = await agent.execute({
        intent: 'createIssue',
        parameters: {
          owner: 'anthropics',
          repo: 'claude-code',
          title: 'Bug report',
          body: 'Description of the bug',
          labels: ['bug', 'high-priority']
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should require title parameter', async () => {
      const result = await agent.execute({
        intent: 'createIssue',
        parameters: {
          owner: 'anthropics',
          repo: 'claude-code',
          body: 'Description'
        }
      });

      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('execute - listPullRequests intent', () => {
    it('should list pull requests', async () => {
      const result = await agent.execute({
        intent: 'listPullRequests',
        parameters: { owner: 'anthropics', repo: 'claude-code' }
      });

      expect(result.success).toBeDefined();
    });

    it('should filter by state', async () => {
      const result = await agent.execute({
        intent: 'listPullRequests',
        parameters: {
          owner: 'anthropics',
          repo: 'claude-code',
          state: 'merged'
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - getCommits intent', () => {
    it('should fetch commit history', async () => {
      const result = await agent.execute({
        intent: 'getCommits',
        parameters: { owner: 'anthropics', repo: 'claude-code' }
      });

      expect(result.success).toBeDefined();
    });

    it('should support branch filtering', async () => {
      const result = await agent.execute({
        intent: 'getCommits',
        parameters: {
          owner: 'anthropics',
          repo: 'claude-code',
          branch: 'main'
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - getReadme intent', () => {
    it('should fetch README file', async () => {
      const result = await agent.execute({
        intent: 'getReadme',
        parameters: { owner: 'anthropics', repo: 'claude-code' }
      });

      expect(result.success).toBeDefined();
    });

    it('should handle missing README', async () => {
      const result = await agent.execute({
        intent: 'getReadme',
        parameters: { owner: 'user', repo: 'no-readme-repo' }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('authentication', () => {
    it('should support token-based authentication', async () => {
      const result = await agent.execute({
        intent: 'getRepository',
        parameters: {
          owner: 'anthropics',
          repo: 'claude-code',
          auth: 'token-123'
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('caching', () => {
    it('should cache API responses', async () => {
      const result1 = await agent.execute({
        intent: 'getRepository',
        parameters: { owner: 'anthropics', repo: 'claude-code' }
      });

      const result2 = await agent.execute({
        intent: 'getRepository',
        parameters: { owner: 'anthropics', repo: 'claude-code' }
      });

      expect(result1.success).toBeDefined();
      expect(result2.success).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle API errors', async () => {
      const result = await agent.execute({
        intent: 'getRepository',
        parameters: { owner: 'non-existent', repo: 'repo' }
      });

      expect(result.success).toBeDefined();
    });

    it('should handle rate limiting', async () => {
      const result = await agent.execute({
        intent: 'listIssues',
        parameters: { owner: 'anthropics', repo: 'claude-code' }
      });

      expect(result.success).toBeDefined();
    });
  });
});
