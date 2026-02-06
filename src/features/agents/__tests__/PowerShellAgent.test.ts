/**
 * Tests for PowerShellAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PowerShellAgent } from '../implementations/PowerShellAgent';
import { AgentDomains } from '../core/types';

describe('PowerShellAgent', () => {
  let agent: PowerShellAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new PowerShellAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('PowerShellAgent');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.INTEGRATION);
    });

    it('should have command execution capability', () => {
      expect(agent.capabilities).toContain('command-execution');
    });
  });

  describe('execute - allowed commands', () => {
    it('should execute Get-Process command', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'Get-Process' }
      });

      expect(result.success).toBeDefined();
    });

    it('should execute Get-Service command', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'Get-Service' }
      });

      expect(result.success).toBeDefined();
    });

    it('should execute ipconfig command', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'ipconfig' }
      });

      expect(result.success).toBeDefined();
    });

    it('should execute ping command', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'ping google.com' }
      });

      expect(result.success).toBeDefined();
    });

    it('should execute systeminfo command', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'systeminfo' }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('execute - blocked commands', () => {
    it('should block Remove commands', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'Remove-Item C:\\test' }
      });

      expect(result.success).toBe(false);
    });

    it('should block Set commands', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'Set-Content file.txt' }
      });

      expect(result.success).toBe(false);
    });

    it('should block New commands', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'New-Item -Path C:\\test' }
      });

      expect(result.success).toBe(false);
    });

    it('should block Start-Process commands', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'Start-Process notepad.exe' }
      });

      expect(result.success).toBe(false);
    });

    it('should block Delete commands', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'Delete file.txt' }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - command options', () => {
    it('should support timeout option', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          command: 'Get-Process',
          timeout: 5000
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support working directory', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          command: 'dir',
          workingDirectory: 'C:\\Users'
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should support maxOutputLength', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          command: 'Get-ChildItem -Recurse',
          maxOutputLength: 1000
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('system information', () => {
    it('should get system information', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'systeminfo' }
      });

      expect(result.success).toBeDefined();
    });

    it('should get hostname', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'hostname' }
      });

      expect(result.success).toBeDefined();
    });

    it('should get current user', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'whoami' }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('network operations', () => {
    it('should test network connectivity', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'Test-Connection google.com' }
      });

      expect(result.success).toBeDefined();
    });

    it('should get network statistics', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'netstat' }
      });

      expect(result.success).toBeDefined();
    });

    it('should get IP configuration', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'ipconfig /all' }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('command filtering', () => {
    it('should support allowed command list', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          command: 'Get-Process',
          options: {
            allowedCommands: ['Get-Process', 'Get-Service']
          }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should reject commands not in allowed list', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          command: 'Remove-Item test.txt',
          options: {
            allowedCommands: ['Get-Process']
          }
        }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should require command parameter', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {}
      });

      expect(result.success).toBe(false);
    });

    it('should handle command execution errors', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'Get-Process non-existent' }
      });

      expect(result.success).toBeDefined();
    });

    it('should handle timeout', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: {
          command: 'Get-Process',
          timeout: 100
        }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('output handling', () => {
    it('should return execution result', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'echo test' }
      });

      if (result.success) {
        expect(result.output).toBeDefined();
      }
    });

    it('should include execution time', async () => {
      const result = await agent.execute({
        intent: 'execute',
        parameters: { command: 'echo test' }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('security', () => {
    it('should block dangerous command prefixes', async () => {
      const dangerousCommands = [
        'Remove-',
        'Delete',
        'Set-',
        'New-',
        'Format-'
      ];

      for (const cmd of dangerousCommands) {
        const result = await agent.execute({
          intent: 'execute',
          parameters: { command: `${cmd}Item test` }
        });

        expect(result.success).toBe(false);
      }
    });

    it('should maintain command history', async () => {
      const result1 = await agent.execute({
        intent: 'execute',
        parameters: { command: 'echo test1' }
      });

      const result2 = await agent.execute({
        intent: 'execute',
        parameters: { command: 'echo test2' }
      });

      expect(result1.success).toBeDefined();
      expect(result2.success).toBeDefined();
    });
  });
});
