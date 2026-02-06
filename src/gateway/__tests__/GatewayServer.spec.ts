import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getGateway, resetGateway } from '../GatewayServer';
import type { ToolExecutor } from '../GatewayServer';
import type { ChannelType, GatewayMessage } from '../types';

// Minimal WebSocket mock
class FakeWS {
  static OPEN = 1;
  readyState = 1; // OPEN
  sent: string[] = [];
  send(data: string) {
    this.sent.push(data);
  }
  parseLast<T = unknown>(): T {
    return JSON.parse(this.sent[this.sent.length - 1]) as T;
  }
}

// Helper: create a valid JWT with payload (unsigned, for testing only)
function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

describe('GatewayServer', () => {
  beforeEach(() => {
    resetGateway();
  });

  afterEach(() => {
    resetGateway();
  });

  // ===========================================================================
  // Subscriptions (original tests preserved)
  // ===========================================================================
  describe('subscriptions', () => {
    it('broadcasts only to subscribed clients', async () => {
      const gw = getGateway();

      const ws1 = new FakeWS();
      const ws2 = new FakeWS();

      expect(gw.registerClient('client1', ws1 as unknown as WebSocket)).toBe(true);
      expect(gw.registerClient('client2', ws2 as unknown as WebSocket)).toBe(true);

      const session = await gw.createSession('user-1', 'webchat' as ChannelType);

      // subscribe only client1
      gw.subscribeClientToSession('client1', session.id);

      await gw.sendMessage(session.id, {
        content: 'hello',
        role: 'assistant'
      });

      // ws1 also receives the broadcast from createSession, plus the sendMessage
      expect(ws1.sent.length).toBeGreaterThanOrEqual(1);
      // ws2 receives broadcast from createSession but NOT the session-scoped message
      const ws2SessionMsgs = ws2.sent
        .map(s => JSON.parse(s))
        .filter((m: GatewayMessage) => m.type === 'message.receive');
      expect(ws2SessionMsgs.length).toBe(0);
    });

    it('enforces token auth when enabled', () => {
      resetGateway();
      const gw = getGateway({ auth: { mode: 'token', secret: 's3cr3t' } });

      const ws = new FakeWS();
      expect(gw.registerClient('c-token', ws as unknown as WebSocket, 'wrong')).toBe(false);
      expect(gw.registerClient('c-token', ws as unknown as WebSocket, 's3cr3t')).toBe(true);
    });
  });

  // ===========================================================================
  // Message Validation
  // ===========================================================================
  describe('validateMessage', () => {
    it('rejects non-object messages', () => {
      const gw = getGateway();
      expect(gw.validateMessage(null).valid).toBe(false);
      expect(gw.validateMessage('string').valid).toBe(false);
      expect(gw.validateMessage(42).valid).toBe(false);
    });

    it('rejects messages without required fields', () => {
      const gw = getGateway();
      const result = gw.validateMessage({ foo: 'bar' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('accepts valid messages', () => {
      const gw = getGateway();
      const result = gw.validateMessage({
        id: 'msg_123',
        type: 'session.list',
        payload: {},
        timestamp: Date.now()
      });
      expect(result.valid).toBe(true);
    });

    it('rejects oversized sessionId', () => {
      const gw = getGateway();
      const result = gw.validateMessage({
        id: 'msg_1',
        type: 'session.list',
        sessionId: 'x'.repeat(200),
        payload: {},
        timestamp: Date.now()
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('sessionId'))).toBe(true);
    });
  });

  // ===========================================================================
  // maxPerUser enforcement
  // ===========================================================================
  describe('maxPerUser', () => {
    it('throws when user exceeds session limit', async () => {
      resetGateway();
      const gw = getGateway({ sessions: { maxPerUser: 2, idleTimeout: 60000, pruneInterval: 60000 } });

      await gw.createSession('user-a', 'webchat');
      await gw.createSession('user-a', 'api');

      await expect(gw.createSession('user-a', 'webchat')).rejects.toThrow(/maximum sessions/);
    });

    it('allows different users independently', async () => {
      resetGateway();
      const gw = getGateway({ sessions: { maxPerUser: 1, idleTimeout: 60000, pruneInterval: 60000 } });

      await gw.createSession('user-a', 'webchat');
      await gw.createSession('user-b', 'webchat');

      expect(gw.listSessions().length).toBe(2);
    });
  });

  // ===========================================================================
  // JWT Authentication
  // ===========================================================================
  describe('JWT authentication', () => {
    it('accepts valid JWT and extracts role', () => {
      resetGateway();
      const gw = getGateway({ auth: { mode: 'jwt' } });

      const token = makeJwt({ sub: 'user-42', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 });
      const ws = new FakeWS();
      expect(gw.registerClient('c-jwt', ws as unknown as WebSocket, token)).toBe(true);
    });

    it('rejects expired JWT', () => {
      resetGateway();
      const gw = getGateway({ auth: { mode: 'jwt' } });

      const token = makeJwt({ sub: 'user-42', exp: Math.floor(Date.now() / 1000) - 3600 });
      const ws = new FakeWS();
      expect(gw.registerClient('c-jwt', ws as unknown as WebSocket, token)).toBe(false);
    });

    it('rejects malformed JWT', () => {
      resetGateway();
      const gw = getGateway({ auth: { mode: 'jwt' } });

      const ws = new FakeWS();
      expect(gw.registerClient('c-jwt', ws as unknown as WebSocket, 'not.a.jwt')).toBe(false);
    });
  });

  // ===========================================================================
  // Permission-based access control
  // ===========================================================================
  describe('permissions', () => {
    it('denies guest from invoking tools via processMessage', async () => {
      resetGateway();
      const gw = getGateway({ auth: { mode: 'jwt' } });

      const guestToken = makeJwt({ sub: 'guest-1', role: 'guest', exp: Math.floor(Date.now() / 1000) + 3600 });
      const ws = new FakeWS();
      gw.registerClient('c-guest', ws as unknown as WebSocket, guestToken);

      await gw.processMessage({
        id: 'msg_1',
        type: 'tool.invoke',
        payload: { toolId: 'web_search', parameters: {}, sessionId: 's1' },
        timestamp: Date.now()
      }, ws as unknown as WebSocket);

      const lastMsg = ws.parseLast<GatewayMessage>();
      expect(lastMsg.type).toBe('error');
      expect((lastMsg.payload as { code: string }).code).toBe('PERMISSION_DENIED');
    });

    it('allows admin to manage channels', async () => {
      resetGateway();
      const gw = getGateway({ auth: { mode: 'jwt' } });

      const adminToken = makeJwt({ sub: 'admin-1', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 });
      const ws = new FakeWS();
      gw.registerClient('c-admin', ws as unknown as WebSocket, adminToken);

      await gw.processMessage({
        id: 'msg_1',
        type: 'channel.connect',
        payload: { type: 'telegram', config: { token: 'tok' } },
        timestamp: Date.now()
      }, ws as unknown as WebSocket);

      const lastMsg = ws.parseLast<GatewayMessage>();
      expect(lastMsg.type).toBe('channel.connect');
    });
  });

  // ===========================================================================
  // Tool Executor Integration
  // ===========================================================================
  describe('tool executor', () => {
    it('executes tool via plugged-in executor', async () => {
      const gw = getGateway();

      const executor: ToolExecutor = {
        hasTool: (name: string) => name === 'add_todo',
        executeTool: async (call) => ({
          tool_call_id: call.id,
          content: JSON.stringify({ success: true, text: call.arguments.text })
        })
      };

      gw.setToolExecutor(executor);

      const result = await gw.invokeTool({
        toolId: 'add_todo',
        parameters: { text: 'Buy milk' },
        sessionId: 's1'
      });

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ success: true, text: 'Buy milk' });
    });

    it('returns error for unknown tool', async () => {
      const gw = getGateway();

      const executor: ToolExecutor = {
        hasTool: () => false,
        executeTool: vi.fn()
      };

      gw.setToolExecutor(executor);

      const result = await gw.invokeTool({
        toolId: 'nonexistent',
        parameters: {},
        sessionId: 's1'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('falls back to event-based execution without executor', async () => {
      const gw = getGateway();

      // Manually resolve the event-based tool execution
      const resultPromise = gw.invokeTool({
        toolId: 'custom_tool',
        parameters: {},
        sessionId: 's1'
      });

      // Simulate external resolution
      setTimeout(() => {
        gw.emit('tool:result:custom_tool', { answer: 42 });
      }, 10);

      const result = await resultPromise;
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ answer: 42 });
    });
  });

  // ===========================================================================
  // Multi-Agent Routing
  // ===========================================================================
  describe('multi-agent routing', () => {
    it('resolves agent based on channel type route', () => {
      resetGateway();
      const gw = getGateway({
        routing: {
          defaultAgentId: 'lisa-main',
          routes: [
            { agentId: 'telegram-agent', channelTypes: ['telegram'], priority: 10 },
            { agentId: 'discord-agent', channelTypes: ['discord'], priority: 10 }
          ]
        }
      });

      expect(gw.resolveAgent('telegram', 'user-1')).toBe('telegram-agent');
      expect(gw.resolveAgent('discord', 'user-1')).toBe('discord-agent');
      expect(gw.resolveAgent('webchat', 'user-1')).toBe('lisa-main');
    });

    it('resolves agent based on user pattern', () => {
      resetGateway();
      const gw = getGateway({
        routing: {
          defaultAgentId: 'lisa-main',
          routes: [
            { agentId: 'vip-agent', userPatterns: ['vip-*'], priority: 20 },
            { agentId: 'general-agent', userPatterns: ['*'], priority: 5 }
          ]
        }
      });

      expect(gw.resolveAgent('webchat', 'vip-user')).toBe('vip-agent');
      expect(gw.resolveAgent('webchat', 'normal-user')).toBe('general-agent');
    });

    it('uses agent routing when creating sessions', async () => {
      resetGateway();
      const gw = getGateway({
        routing: {
          defaultAgentId: 'lisa-main',
          routes: [
            { agentId: 'tg-handler', channelTypes: ['telegram'], priority: 10 }
          ]
        }
      });

      const session = await gw.createSession('user-1', 'telegram');
      expect(session.agentId).toBe('tg-handler');
    });

    it('skips stopped agents during routing', async () => {
      resetGateway();
      const gw = getGateway();

      const agent = await gw.spawnAgent('custom-agent', [], {
        channelTypes: ['webchat'],
        priority: 100
      });

      // Agent is running, should be selected
      expect(gw.resolveAgent('webchat', 'user-1')).toBe(agent.id);

      // Stop the agent
      await gw.stopAgent(agent.id);

      // Falls back to default
      expect(gw.resolveAgent('webchat', 'user-1')).toBe('lisa-main');
    });
  });

  // ===========================================================================
  // Skill Management
  // ===========================================================================
  describe('skills', () => {
    it('installs and lists skills', async () => {
      const gw = getGateway();

      const skill = await gw.installSkill({
        name: 'weather',
        version: '1.0.0',
        description: 'Weather forecasts',
        entryPoint: './skills/weather.js'
      });

      expect(skill.enabled).toBe(true);
      expect(gw.listSkills().length).toBe(1);
      expect(gw.getSkill('weather')).toBeDefined();
    });

    it('prevents duplicate skill installation', async () => {
      const gw = getGateway();

      await gw.installSkill({
        name: 'weather',
        version: '1.0.0',
        description: 'Weather',
        entryPoint: './weather.js'
      });

      await expect(gw.installSkill({
        name: 'weather',
        version: '2.0.0',
        description: 'Weather v2',
        entryPoint: './weather2.js'
      })).rejects.toThrow(/already installed/);
    });

    it('uninstalls skills', async () => {
      const gw = getGateway();

      await gw.installSkill({
        name: 'translate',
        version: '1.0.0',
        description: 'Translation',
        entryPoint: './translate.js'
      });

      const removed = await gw.uninstallSkill('translate');
      expect(removed).toBe(true);
      expect(gw.listSkills().length).toBe(0);
      expect(await gw.uninstallSkill('translate')).toBe(false);
    });
  });

  // ===========================================================================
  // Agent Management
  // ===========================================================================
  describe('agents', () => {
    it('spawns and lists agents', async () => {
      const gw = getGateway();

      const agent = await gw.spawnAgent('code-review', ['review', 'lint']);

      expect(agent.status).toBe('running');
      expect(agent.capabilities).toEqual(['review', 'lint']);
      expect(gw.listAgents().length).toBe(1);
    });

    it('stops agent and removes its routes', async () => {
      const gw = getGateway();

      const agent = await gw.spawnAgent('temp-agent', [], {
        channelTypes: ['webchat'],
        priority: 5
      });

      expect(gw.getConfig().routing.routes.length).toBe(1);

      await gw.stopAgent(agent.id);

      expect(gw.listAgents().length).toBe(0);
      expect(gw.getConfig().routing.routes.length).toBe(0);
    });
  });

  // ===========================================================================
  // processMessage with validation
  // ===========================================================================
  describe('processMessage validation', () => {
    it('rejects invalid message structure', async () => {
      const gw = getGateway();
      const ws = new FakeWS();
      gw.registerClient('c1', ws as unknown as WebSocket);

      await gw.processMessage({ broken: true } as unknown as GatewayMessage, ws as unknown as WebSocket);

      const lastMsg = ws.parseLast<GatewayMessage>();
      expect(lastMsg.type).toBe('error');
      expect((lastMsg.payload as { code: string }).code).toBe('INVALID_MESSAGE');
    });

    it('rejects unregistered client', async () => {
      const gw = getGateway();
      const ws = new FakeWS();

      await gw.processMessage({
        id: 'msg_1',
        type: 'session.list',
        payload: {},
        timestamp: Date.now()
      }, ws as unknown as WebSocket);

      const lastMsg = ws.parseLast<GatewayMessage>();
      expect(lastMsg.type).toBe('error');
      expect((lastMsg.payload as { code: string }).code).toBe('UNREGISTERED_CLIENT');
    });
  });

  // ===========================================================================
  // Stats
  // ===========================================================================
  describe('getStats', () => {
    it('returns comprehensive stats', async () => {
      const gw = getGateway();

      await gw.createSession('user-1', 'webchat');
      await gw.connectChannel('telegram', {});
      await gw.installSkill({ name: 's1', version: '1.0', description: '', entryPoint: '' });
      await gw.spawnAgent('a1');

      const ws = new FakeWS();
      gw.registerClient('c1', ws as unknown as WebSocket);

      const stats = gw.getStats();
      expect(stats.sessions).toBe(1);
      expect(stats.channels).toBe(1);
      expect(stats.clients).toBe(1);
      expect(stats.skills).toBe(1);
      expect(stats.agents).toBe(1);
    });
  });

  // ===========================================================================
  // WebSocket handlers via processMessage
  // ===========================================================================
  describe('skill handlers via processMessage', () => {
    it('handles skill.list message', async () => {
      const gw = getGateway();
      const ws = new FakeWS();
      gw.registerClient('c1', ws as unknown as WebSocket);

      await gw.installSkill({ name: 'test-skill', version: '1.0.0', description: 'Test', entryPoint: './test.js' });

      await gw.processMessage({
        id: 'msg_1',
        type: 'skill.list',
        payload: {},
        timestamp: Date.now()
      }, ws as unknown as WebSocket);

      const lastMsg = ws.parseLast<GatewayMessage>();
      expect(lastMsg.type).toBe('skill.list');
      expect(Array.isArray(lastMsg.payload)).toBe(true);
      expect((lastMsg.payload as unknown[]).length).toBe(1);
    });
  });

  describe('agent handlers via processMessage', () => {
    it('handles agent.list message', async () => {
      const gw = getGateway();
      const ws = new FakeWS();
      gw.registerClient('c1', ws as unknown as WebSocket);

      await gw.spawnAgent('list-test-agent');

      await gw.processMessage({
        id: 'msg_1',
        type: 'agent.list',
        payload: {},
        timestamp: Date.now()
      }, ws as unknown as WebSocket);

      const lastMsg = ws.parseLast<GatewayMessage>();
      expect(lastMsg.type).toBe('agent.list');
      expect(Array.isArray(lastMsg.payload)).toBe(true);
      expect((lastMsg.payload as unknown[]).length).toBe(1);
    });
  });
});
