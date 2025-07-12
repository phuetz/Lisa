/**
 * @file Unit tests for the GeminiCodeAgent.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiCodeAgent } from './GeminiCodeAgent';
import { exec } from 'child_process';
import { promises as fs } from 'fs';

// Mock child_process and fs
vi.mock('child_process');
vi.mock('fs', () => ({
  promises: {
    stat: vi.fn(),
  },
}));

const mockedExec = vi.mocked(exec);
const mockedFsStat = fs.stat as ReturnType<typeof vi.fn>;

describe('GeminiCodeAgent', () => {
  let agent: GeminiCodeAgent;

  beforeEach(() => {
    agent = new GeminiCodeAgent();
    mockedExec.mockClear();
    mockedFsStat.mockClear();
  });

  it('should generate code successfully using Gemini CLI', async () => {
    const mockCliResponse = 'export const hello = () => "world";';
    mockedFsStat.mockResolvedValue({ isFile: () => true }); // Credentials exist
    mockedExec.mockImplementation((_command, _options, callback) => {
      if (typeof callback === 'function') {
        callback(null, mockCliResponse, '');
      }
      return {} as any;
    });

    const result = await agent.generateCode('create a hello world function');

    expect(result.success).toBe(true);
    expect(result.content).toBe(mockCliResponse);
    expect(result.source).toBe('gemini');
    expect(mockedExec).toHaveBeenCalledTimes(1);
  });

  it('should return an error if Gemini credentials are not found', async () => {
    mockedFsStat.mockRejectedValue(new Error('File not found')); // No credentials

    const result = await agent.generateCode('any prompt');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Gemini credentials not found.');
    expect(result.source).toBe('error');
    expect(mockedExec).not.toHaveBeenCalled();
  });

  it('should handle errors from the Gemini CLI', async () => {
    const cliError = 'Invalid API key';
    mockedFsStat.mockResolvedValue({ isFile: () => true });
    mockedExec.mockImplementation((_command, _options, callback) => {
      if (typeof callback === 'function') {
        callback(null, '', cliError);
      }
      return {} as any;
    });

    const result = await agent.generateCode('any prompt');

    expect(result.success).toBe(false);
    expect(result.error).toBe(cliError);
    expect(result.source).toBe('gemini');
  });

  it('should fallback to local Gemma model if CLI execution fails', async () => {
    mockedFsStat.mockResolvedValue({ isFile: () => true });
    mockedExec.mockImplementation((_command, _options, callback) => {
      if (typeof callback === 'function') {
        callback(new Error('CLI command failed'), '', '');
      }
      return {} as any;
    });

    const result = await agent.generateCode('any prompt');

    expect(result.success).toBe(true);
    expect(result.source).toBe('gemma');
    expect(result.content).toContain('// Code Gemma fallback response');
  });

  it('should fallback to local Gemma model if daily quota is reached', async () => {
    // Manually set the internal state to simulate quota reached
    (agent as any).currentRequestCount = 900;

    const result = await agent.generateCode('any prompt');

    expect(result.success).toBe(true);
    expect(result.source).toBe('gemma');
    expect(result.content).toContain('// Code Gemma fallback response');
    // CLI should not be called if quota is reached
    expect(mockedExec).not.toHaveBeenCalled();
  });
});
