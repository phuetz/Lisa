import { execFileSync } from 'child_process';
import { AgentDomains } from '../core/types';
import type {
  AgentCapability,
  AgentExecuteProps,
  AgentExecuteResult,
  AgentParameter,
  BaseAgent,
} from '../core/types';

export type GitNexusAction = 'query' | 'search_code' | 'context' | 'impact' | 'diagram';

const GITNEXUS_BIN = process.env.GITNEXUS_BIN || 'gitnexus';

/**
 * GitNexusAgent — connects Lisa to the GitNexus code intelligence engine.
 * Allows Lisa to query knowledge graphs built from source code repositories.
 *
 * Requires gitnexus CLI in PATH or GITNEXUS_BIN env var.
 */
export class GitNexusAgent implements BaseAgent {
  name = 'GitNexusAgent';
  description =
    'Queries a GitNexus knowledge graph to understand codebases: search symbols, trace call graphs, analyze impact, generate diagrams.';
  version = '1.0.0';
  domain = AgentDomains.KNOWLEDGE;
  capabilities: AgentCapability[] = [
    {
      name: 'query',
      description: 'Run a natural language or Cypher query on the indexed codebase',
      requiredParameters: [
        { name: 'repoPath', type: 'string', required: true, description: 'Path to the indexed repository' },
        { name: 'q', type: 'string', required: true, description: 'Query string or natural language question' },
      ],
    },
    {
      name: 'search_code',
      description: 'Full-text search across all symbols and files',
      requiredParameters: [
        { name: 'repoPath', type: 'string', required: true },
        { name: 'q', type: 'string', required: true },
      ],
    },
    {
      name: 'context',
      description: 'Get full context around a specific symbol (methods, callers, callees)',
      requiredParameters: [
        { name: 'repoPath', type: 'string', required: true },
        { name: 'symbol', type: 'string', required: true, description: 'Symbol name or qualified path' },
      ],
    },
    {
      name: 'impact',
      description: 'Analyze the impact of changing a file or symbol',
      requiredParameters: [
        { name: 'repoPath', type: 'string', required: true },
        { name: 'target', type: 'string', required: true, description: 'File path or symbol name' },
      ],
    },
    {
      name: 'diagram',
      description: 'Generate a Mermaid call graph or dependency diagram',
      requiredParameters: [
        { name: 'repoPath', type: 'string', required: true },
        { name: 'symbol', type: 'string', required: true },
      ],
    },
  ];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const action = (props.action || props.intent || 'query') as GitNexusAction;
    const params = props.parameters || {};
    const repoPath: string = params.repoPath || '';

    if (!repoPath) {
      return { success: false, output: null, error: 'repoPath parameter is required' };
    }

    try {
      let args: string[] = [];

      switch (action) {
        case 'query':
          args = ['query', '--path', repoPath, '--q', params.q || ''];
          break;
        case 'search_code':
          args = ['search', '--path', repoPath, '--q', params.q || ''];
          break;
        case 'context':
          args = ['context', '--path', repoPath, '--symbol', params.symbol || ''];
          break;
        case 'impact':
          args = ['impact', '--path', repoPath, '--target', params.target || ''];
          break;
        case 'diagram':
          args = ['diagram', '--path', repoPath, '--symbol', params.symbol || ''];
          break;
        default:
          return { success: false, output: null, error: `Unknown action: ${action}` };
      }

      const result = execFileSync(GITNEXUS_BIN, args, {
        encoding: 'utf8',
        timeout: 30000,
        maxBuffer: 5 * 1024 * 1024,
      });

      return {
        success: true,
        output: result,
        metadata: {
          executionTime: Date.now() - startTime,
          source: 'GitNexus',
          timestamp: Date.now(),
        },
      };
    } catch (err: any) {
      return {
        success: false,
        output: null,
        error: err.message || String(err),
        metadata: { executionTime: Date.now() - startTime },
      };
    }
  }
}
