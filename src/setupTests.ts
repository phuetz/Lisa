import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks for SDK Workers and Worklets
vi.mock('@lisa-sdk/vision/worker?worker', () => ({ 
  default: class MockVisionWorker {
    postMessage() {}
    onmessage = null;
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  } 
}));

vi.mock('@lisa-sdk/hearing/worker?worker', () => ({ 
  default: class MockHearingWorker {
    postMessage() {}
    onmessage = null;
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  } 
}));

vi.mock('@lisa-sdk/hearing/processor?url', () => ({ default: 'mock-processor-url' }));

// Gateway bot library mocks (optional dependencies)
vi.mock('discord.js', () => {
  const EventEmitter = class { on() { return this; } emit() { return true; } removeAllListeners() { return this; } };
  return {
    Client: class extends EventEmitter { login() { return Promise.resolve('token'); } destroy() {} user = { tag: 'MockBot#0000' }; },
    GatewayIntentBits: { Guilds: 1, GuildMessages: 2, MessageContent: 4 },
    Events: { ClientReady: 'ready', MessageCreate: 'messageCreate' },
  };
});

vi.mock('@slack/bolt', () => ({
  App: class {
    event() {} message() {} start() { return Promise.resolve(); } stop() { return Promise.resolve(); }
  },
}));

vi.mock('grammy', () => ({
  Bot: class {
    on() {} start() {} stop() {} api = { sendMessage() { return Promise.resolve(); } };
  },
}));

vi.mock('@octokit/rest', () => ({
  Octokit: class {
    repos = { get: () => Promise.resolve({ data: {} }), listForAuthenticatedUser: () => Promise.resolve({ data: [] }) };
    issues = { listForRepo: () => Promise.resolve({ data: [] }), create: () => Promise.resolve({ data: {} }) };
    pulls = { list: () => Promise.resolve({ data: [] }) };
    git = { getCommit: () => Promise.resolve({ data: {} }) };
  },
}));
