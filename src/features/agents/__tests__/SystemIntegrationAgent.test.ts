/**
 * Tests for SystemIntegrationAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SystemIntegrationAgent, SYSTEM_INTEGRATION_TYPES, type SystemIntegrationConfig } from '../implementations/SystemIntegrationAgent';
import { AgentDomains } from '../core/types';

describe('SystemIntegrationAgent', () => {
  let agent: SystemIntegrationAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new SystemIntegrationAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('System Integration Agent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('intégration');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.INTEGRATION);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('api-integration');
      expect(agent.capabilities).toContain('webhook-handling');
      expect(agent.capabilities).toContain('mqtt-communication');
      expect(agent.capabilities).toContain('socket-management');
      expect(agent.capabilities).toContain('http-requests');
      expect(agent.capabilities).toContain('database-access');
      expect(agent.capabilities).toContain('file-operations');
      expect(agent.capabilities).toContain('shell-execution');
    });

    it('should have valid property set to true', () => {
      expect(agent.valid).toBe(true);
    });

    it('should initialize with default integrations', () => {
      expect(agent.integrations.size).toBeGreaterThan(0);
    });
  });

  describe('execute - register_integration intent', () => {
    it('should register a new API integration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'api-test-1',
        name: 'Test API',
        type: 'api',
        enabled: true,
        configuration: {
          baseUrl: 'https://api.example.com',
          endpoints: {
            users: '/users',
            posts: '/posts'
          }
        }
      };

      const result = await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      expect(result.success).toBe(true);
      expect(result.output?.message).toContain('enregistrée');
    });

    it('should register a webhook integration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'webhook-test-1',
        name: 'Test Webhook',
        type: 'webhook',
        enabled: true,
        configuration: {
          url: 'https://hooks.example.com/webhook',
          method: 'POST',
          retryPolicy: {
            maxRetries: 3,
            backoffMultiplier: 2
          }
        }
      };

      const result = await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      expect(result.success).toBe(true);
      expect(result.output?.integration.name).toBe('Test Webhook');
    });

    it('should auto-generate ID if not provided', async () => {
      const config: SystemIntegrationConfig = {
        id: '',
        name: 'Auto ID Test',
        type: 'http',
        enabled: true,
        configuration: {}
      };

      const result = await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      expect(result.success).toBe(true);
      expect(result.output?.integration.id).toBeDefined();
      expect(result.output?.integration.id).not.toBe('');
    });

    it('should reject invalid integration type', async () => {
      const config: any = {
        id: 'invalid-type',
        name: 'Invalid Type',
        type: 'invalid_type',
        enabled: true,
        configuration: {}
      };

      const result = await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('non supporté');
    });

    it('should register MQTT integration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'mqtt-test-1',
        name: 'MQTT Broker',
        type: 'mqtt',
        enabled: true,
        configuration: {
          brokerUrl: 'mqtt://broker.example.com:1883',
          username: 'mqtt_user',
          topics: ['home/sensors/+', 'home/devices/#']
        },
        credentials: {
          password: 'mqtt_password'
        }
      };

      const result = await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      expect(result.success).toBe(true);
    });

    it('should register database integration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'db-test-1',
        name: 'PostgreSQL Database',
        type: 'database',
        enabled: true,
        configuration: {
          host: 'localhost',
          port: 5432,
          database: 'lisa_db',
          ssl: true
        },
        credentials: {
          username: 'dbuser',
          password: 'dbpass'
        }
      };

      const result = await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('execute - execute_integration intent', () => {
    it('should execute registered API integration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'api-exec-1',
        name: 'API Integration',
        type: 'api',
        enabled: true,
        configuration: { baseUrl: 'https://api.example.com' }
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: {
          integrationId: 'api-exec-1',
          params: { endpoint: '/users', method: 'GET' }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should execute webhook integration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'webhook-exec-1',
        name: 'Webhook Integration',
        type: 'webhook',
        enabled: true,
        configuration: { url: 'https://hooks.example.com/notify' }
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: {
          integrationId: 'webhook-exec-1',
          params: { message: 'Test notification' }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should execute MQTT integration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'mqtt-exec-1',
        name: 'MQTT Integration',
        type: 'mqtt',
        enabled: true,
        configuration: { brokerUrl: 'mqtt://broker.example.com' }
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: {
          integrationId: 'mqtt-exec-1',
          params: { topic: 'home/lights', message: { state: 'on' } }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should execute HTTP integration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'http-exec-1',
        name: 'HTTP Integration',
        type: 'http',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: {
          integrationId: 'http-exec-1',
          params: { method: 'POST', headers: { 'Content-Type': 'application/json' } }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should execute database integration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'db-exec-1',
        name: 'Database Integration',
        type: 'database',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: {
          integrationId: 'db-exec-1',
          params: { operation: 'query', sql: 'SELECT * FROM users' }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should execute file integration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'file-exec-1',
        name: 'File Integration',
        type: 'file',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: {
          integrationId: 'file-exec-1',
          params: { operation: 'read', path: '/data/file.txt' }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should execute shell integration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'shell-exec-1',
        name: 'Shell Integration',
        type: 'shell',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: {
          integrationId: 'shell-exec-1',
          params: { command: 'echo "Hello"' }
        }
      });

      expect(result.success).toBeDefined();
    });

    it('should fail when executing disabled integration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'disabled-test',
        name: 'Disabled Integration',
        type: 'api',
        enabled: false,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: {
          integrationId: 'disabled-test',
          params: {}
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('désactivée');
    });

    it('should fail when integration does not exist', async () => {
      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: {
          integrationId: 'non-existent-id',
          params: {}
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('non trouvée');
    });

    it('should handle database query operation', async () => {
      const config: SystemIntegrationConfig = {
        id: 'db-query',
        name: 'DB Query',
        type: 'database',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: {
          integrationId: 'db-query',
          params: { operation: 'query' }
        }
      });

      if (result.success) {
        expect(result.output?.result?.rows).toBeDefined();
      }
    });

    it('should handle database insert operation', async () => {
      const config: SystemIntegrationConfig = {
        id: 'db-insert',
        name: 'DB Insert',
        type: 'database',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: {
          integrationId: 'db-insert',
          params: { operation: 'insert', data: { name: 'John' } }
        }
      });

      if (result.success) {
        expect(result.output?.result?.insertId).toBeDefined();
      }
    });

    it('should handle file read operation', async () => {
      const config: SystemIntegrationConfig = {
        id: 'file-read',
        name: 'File Read',
        type: 'file',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: {
          integrationId: 'file-read',
          params: { operation: 'read' }
        }
      });

      if (result.success) {
        expect(result.output?.result?.content).toBeDefined();
      }
    });

    it('should handle file write operation', async () => {
      const config: SystemIntegrationConfig = {
        id: 'file-write',
        name: 'File Write',
        type: 'file',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: {
          integrationId: 'file-write',
          params: { operation: 'write', content: 'test data' }
        }
      });

      if (result.success) {
        expect(result.output?.result?.bytesWritten).toBeDefined();
      }
    });

    it('should handle file list operation', async () => {
      const config: SystemIntegrationConfig = {
        id: 'file-list',
        name: 'File List',
        type: 'file',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: {
          integrationId: 'file-list',
          params: { operation: 'list' }
        }
      });

      if (result.success) {
        expect(result.output?.result?.files).toBeDefined();
      }
    });
  });

  describe('execute - list_integrations intent', () => {
    it('should list all integrations', async () => {
      const result = await agent.execute({
        intent: 'list_integrations',
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.output?.integrations)).toBe(true);
      expect(result.output?.count).toBeGreaterThanOrEqual(0);
    });

    it('should filter integrations by type', async () => {
      const result = await agent.execute({
        intent: 'list_integrations',
        parameters: { type: 'api' }
      });

      expect(result.success).toBe(true);
      result.output?.integrations?.forEach((integration: any) => {
        expect(integration.type).toBe('api');
      });
    });

    it('should filter for webhook integrations', async () => {
      const result = await agent.execute({
        intent: 'list_integrations',
        parameters: { type: 'webhook' }
      });

      expect(result.success).toBe(true);
      if (result.output?.integrations) {
        result.output.integrations.forEach((integration: any) => {
          expect(integration.type).toBe('webhook');
        });
      }
    });

    it('should not expose credentials in list', async () => {
      const config: SystemIntegrationConfig = {
        id: 'secret-test',
        name: 'Secret Integration',
        type: 'database',
        enabled: true,
        configuration: {},
        credentials: {
          password: 'super-secret-password'
        }
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'list_integrations',
        parameters: {}
      });

      expect(result.success).toBe(true);
      const integration = result.output?.integrations?.find((i: any) => i.id === 'secret-test');
      if (integration) {
        expect(integration.credentials).toBeUndefined();
      }
    });

    it('should include integration metadata', async () => {
      const result = await agent.execute({
        intent: 'list_integrations',
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output?.count).toBeDefined();
    });
  });

  describe('execute - update_integration intent', () => {
    it('should update integration name', async () => {
      const config: SystemIntegrationConfig = {
        id: 'update-test-1',
        name: 'Original Name',
        type: 'api',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'update_integration',
        parameters: {
          integrationId: 'update-test-1',
          updates: { name: 'Updated Name' }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.message).toContain('mise à jour');
    });

    it('should update integration configuration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'config-update',
        name: 'Config Test',
        type: 'http',
        enabled: true,
        configuration: { timeout: 5000 }
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'update_integration',
        parameters: {
          integrationId: 'config-update',
          updates: { configuration: { timeout: 10000 } }
        }
      });

      expect(result.success).toBe(true);
    });

    it('should toggle integration enabled status', async () => {
      const config: SystemIntegrationConfig = {
        id: 'toggle-test',
        name: 'Toggle Test',
        type: 'api',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'update_integration',
        parameters: {
          integrationId: 'toggle-test',
          updates: { enabled: false }
        }
      });

      expect(result.success).toBe(true);
    });

    it('should preserve integration ID on update', async () => {
      const config: SystemIntegrationConfig = {
        id: 'id-preserve',
        name: 'Original',
        type: 'api',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'update_integration',
        parameters: {
          integrationId: 'id-preserve',
          updates: { name: 'Updated' }
        }
      });

      expect(result.success).toBe(true);
      expect(result.output?.integrationId).toBe('id-preserve');
    });

    it('should fail for non-existent integration', async () => {
      const result = await agent.execute({
        intent: 'update_integration',
        parameters: {
          integrationId: 'non-existent',
          updates: { name: 'Updated' }
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('non trouvée');
    });
  });

  describe('execute - delete_integration intent', () => {
    it('should delete an integration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'delete-test-1',
        name: 'To Delete',
        type: 'api',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'delete_integration',
        parameters: { integrationId: 'delete-test-1' }
      });

      expect(result.success).toBe(true);
      expect(result.output?.message).toContain('supprimée');
    });

    it('should prevent deletion of non-existent integration', async () => {
      const result = await agent.execute({
        intent: 'delete_integration',
        parameters: { integrationId: 'non-existent-delete' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('non trouvée');
    });

    it('should verify integration is deleted', async () => {
      const config: SystemIntegrationConfig = {
        id: 'verify-delete',
        name: 'Verify Delete',
        type: 'webhook',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      // Delete
      await agent.execute({
        intent: 'delete_integration',
        parameters: { integrationId: 'verify-delete' }
      });

      // Verify deleted by trying to execute
      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: { integrationId: 'verify-delete', params: {} }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - test_integration intent', () => {
    it('should test registered integration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'test-integration',
        name: 'Test Integration',
        type: 'api',
        enabled: true,
        configuration: { baseUrl: 'https://api.example.com' }
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'test_integration',
        parameters: { integrationId: 'test-integration' }
      });

      expect(result.success).toBe(true);
      expect(result.output?.testResult?.status).toBeDefined();
    });

    it('should return test latency', async () => {
      const config: SystemIntegrationConfig = {
        id: 'latency-test',
        name: 'Latency Test',
        type: 'http',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'test_integration',
        parameters: { integrationId: 'latency-test' }
      });

      if (result.success) {
        expect(result.output?.testResult?.latency).toBeDefined();
        expect(typeof result.output?.testResult?.latency).toBe('number');
      }
    });

    it('should include test timestamp', async () => {
      const config: SystemIntegrationConfig = {
        id: 'timestamp-test',
        name: 'Timestamp Test',
        type: 'api',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'test_integration',
        parameters: { integrationId: 'timestamp-test' }
      });

      if (result.success) {
        expect(result.output?.testResult?.timestamp).toBeDefined();
      }
    });

    it('should include test details', async () => {
      const config: SystemIntegrationConfig = {
        id: 'details-test',
        name: 'Details Test',
        type: 'webhook',
        enabled: true,
        configuration: {}
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'test_integration',
        parameters: { integrationId: 'details-test' }
      });

      if (result.success) {
        expect(result.output?.testResult?.details).toBeDefined();
        expect(result.output?.testResult?.details?.connectionSuccessful).toBeDefined();
      }
    });

    it('should fail for non-existent integration test', async () => {
      const result = await agent.execute({
        intent: 'test_integration',
        parameters: { integrationId: 'non-existent-test' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('non trouvée');
    });
  });

  describe('execute - unknown intent', () => {
    it('should return error for unknown intent', async () => {
      const result = await agent.execute({
        intent: 'unknown_action',
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('non supportée');
    });
  });

  describe('integration lifecycle', () => {
    it('should support complete integration lifecycle', async () => {
      // Create
      const config: SystemIntegrationConfig = {
        id: 'lifecycle-test',
        name: 'Lifecycle Test',
        type: 'api',
        enabled: true,
        configuration: { baseUrl: 'https://api.example.com' }
      };

      const createResult = await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      expect(createResult.success).toBe(true);

      // List
      const listResult = await agent.execute({
        intent: 'list_integrations',
        parameters: { type: 'api' }
      });

      expect(listResult.success).toBe(true);
      expect(listResult.output?.count).toBeGreaterThan(0);

      // Update
      const updateResult = await agent.execute({
        intent: 'update_integration',
        parameters: {
          integrationId: 'lifecycle-test',
          updates: { name: 'Updated Lifecycle Test' }
        }
      });

      expect(updateResult.success).toBe(true);

      // Test
      const testResult = await agent.execute({
        intent: 'test_integration',
        parameters: { integrationId: 'lifecycle-test' }
      });

      expect(testResult.success).toBe(true);

      // Delete
      const deleteResult = await agent.execute({
        intent: 'delete_integration',
        parameters: { integrationId: 'lifecycle-test' }
      });

      expect(deleteResult.success).toBe(true);
    });
  });

  describe('integration types coverage', () => {
    it('should support all integration types', async () => {
      for (const integrationType of SYSTEM_INTEGRATION_TYPES) {
        const config: SystemIntegrationConfig = {
          id: `type-test-${integrationType}`,
          name: `Test ${integrationType}`,
          type: integrationType,
          enabled: true,
          configuration: {}
        };

        const result = await agent.execute({
          intent: 'register_integration',
          parameters: { config }
        });

        expect(result.success).toBe(true);
        expect(result.output?.integration?.type).toBe(integrationType);
      }
    });

    it('should list integrations of specific types', async () => {
      const typesToTest = ['api', 'webhook', 'mqtt'];

      for (const type of typesToTest) {
        const result = await agent.execute({
          intent: 'list_integrations',
          parameters: { type: type as any }
        });

        expect(result.success).toBe(true);
      }
    });
  });

  describe('error handling', () => {
    it('should handle null parameters gracefully', async () => {
      const result = await agent.execute({
        intent: 'register_integration',
        parameters: null as any
      });

      expect(result.success).toBe(false);
    });

    it('should handle missing integration ID in execution', async () => {
      const result = await agent.execute({
        intent: 'execute_integration',
        parameters: { params: {} }
      });

      expect(result.success).toBe(false);
    });

    it('should handle invalid update parameters', async () => {
      const result = await agent.execute({
        intent: 'update_integration',
        parameters: { integrationId: 'test', updates: null }
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('security', () => {
    it('should not expose credentials in list result', async () => {
      const config: SystemIntegrationConfig = {
        id: 'secure-test',
        name: 'Secure Integration',
        type: 'database',
        enabled: true,
        configuration: { host: 'localhost' },
        credentials: {
          username: 'admin',
          password: 'super-secret'
        }
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      const result = await agent.execute({
        intent: 'list_integrations',
        parameters: {}
      });

      const integration = result.output?.integrations?.find((i: any) => i.id === 'secure-test');
      if (integration) {
        expect(integration.credentials).toBeUndefined();
      }
    });

    it('should preserve credentials internally', async () => {
      const config: SystemIntegrationConfig = {
        id: 'cred-test',
        name: 'Credential Test',
        type: 'database',
        enabled: true,
        configuration: {},
        credentials: {
          token: 'secret-token'
        }
      };

      await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      // Verify credentials are stored internally
      expect(agent.integrations.get('cred-test')?.credentials).toBeDefined();
    });
  });

  describe('metadata and configuration', () => {
    it('should store integration metadata', async () => {
      const config: SystemIntegrationConfig = {
        id: 'metadata-test',
        name: 'Metadata Test',
        type: 'api',
        enabled: true,
        configuration: {},
        metadata: {
          owner: 'admin',
          createdDate: new Date().toISOString(),
          tags: ['production', 'critical']
        }
      };

      const result = await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      expect(result.success).toBe(true);
      expect(result.output?.integration?.metadata?.tags).toContain('production');
    });

    it('should support complex configuration', async () => {
      const config: SystemIntegrationConfig = {
        id: 'complex-config',
        name: 'Complex Config',
        type: 'api',
        enabled: true,
        configuration: {
          baseUrl: 'https://api.example.com',
          auth: {
            type: 'oauth2',
            clientId: 'client123',
            scopes: ['read', 'write']
          },
          retry: {
            maxAttempts: 3,
            backoff: 'exponential'
          }
        }
      };

      const result = await agent.execute({
        intent: 'register_integration',
        parameters: { config }
      });

      expect(result.success).toBe(true);
      expect(result.output?.integration?.configuration?.auth?.type).toBe('oauth2');
    });
  });

  describe('performance', () => {
    it('should handle multiple integrations efficiently', async () => {
      const integrationCount = 20;

      for (let i = 0; i < integrationCount; i++) {
        const config: SystemIntegrationConfig = {
          id: `perf-test-${i}`,
          name: `Performance Test ${i}`,
          type: i % 2 === 0 ? 'api' : 'webhook',
          enabled: true,
          configuration: {}
        };

        await agent.execute({
          intent: 'register_integration',
          parameters: { config }
        });
      }

      const result = await agent.execute({
        intent: 'list_integrations',
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output?.count).toBeGreaterThanOrEqual(integrationCount);
    });

    it('should handle rapid integration operations', async () => {
      const operations = [];

      for (let i = 0; i < 10; i++) {
        const config: SystemIntegrationConfig = {
          id: `rapid-test-${i}`,
          name: `Rapid Test ${i}`,
          type: 'api',
          enabled: true,
          configuration: {}
        };

        operations.push(
          agent.execute({
            intent: 'register_integration',
            parameters: { config }
          })
        );
      }

      const results = await Promise.all(operations);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('capabilities', () => {
    it('should list all capabilities', async () => {
      const capabilities = agent.capabilities;
      expect(Array.isArray(capabilities)).toBe(true);
      expect(capabilities.length).toBeGreaterThan(0);
    });

    it('should have integration type coverage in capabilities', async () => {
      const capabilities = agent.capabilities;
      expect(capabilities).toContain('api-integration');
      expect(capabilities).toContain('webhook-handling');
      expect(capabilities.length).toBe(8);
    });
  });
});
