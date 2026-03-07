/**
 * Knowledge Tools - Native LLM Tools for Knowledge Graph
 *
 * Provides tools that can be called by the LLM to:
 * - Store facts and relationships in the knowledge graph
 * - Query existing knowledge
 * - Search across all stored knowledge
 *
 * Uses the KnowledgeGraphService for persistent storage (localStorage).
 */

import { toolCallingService, type ToolDefinition } from './ToolCallingService';
import { getKnowledgeGraph } from './KnowledgeGraphService';
import type { Predicate } from './KnowledgeGraphService';

// ============================================================================
// Knowledge Store Tool
// ============================================================================

const knowledgeStoreTool: ToolDefinition = {
  name: 'knowledge_store',
  description: 'Store a fact or relationship in the knowledge graph. Use this to remember information about the user, their preferences, projects, or any relationship between entities. Examples: "Patrick likes TypeScript", "Lisa project uses React", "User lives in Strasbourg".',
  parameters: {
    type: 'object',
    properties: {
      subject: {
        type: 'string',
        description: 'The subject entity (e.g., "Patrick", "Lisa project", "User")'
      },
      predicate: {
        type: 'string',
        description: 'The relationship type: "isA", "hasProperty", "dependsOn", "relatedTo", "knows", "likes", "remembers", "mentionedIn", "uses", "contains", "createdBy", "partOf"'
      },
      object: {
        type: 'string',
        description: 'The object entity (e.g., "TypeScript", "React", "Strasbourg")'
      }
    },
    required: ['subject', 'predicate', 'object']
  },
  handler: async (args) => {
    const kg = getKnowledgeGraph();
    const subject = args.subject as string;
    const predicate = args.predicate as Predicate;
    const object = args.object as string;

    const alreadyExists = kg.has(subject, predicate, object);
    if (alreadyExists) {
      return {
        success: true,
        message: `Ce fait existe deja: "${subject}" ${predicate} "${object}"`,
        alreadyExisted: true
      };
    }

    kg.add(subject, predicate, object, {
      source: 'conversation',
      addedAt: new Date().toISOString()
    });
    // Prefer IndexedDB (higher capacity), fall back to localStorage
    await kg.persistAsync();

    return {
      success: true,
      message: `Fait memorise: "${subject}" ${predicate} "${object}"`,
      stats: kg.stats()
    };
  }
};

// ============================================================================
// Knowledge Query Tool
// ============================================================================

const knowledgeQueryTool: ToolDefinition = {
  name: 'knowledge_query',
  description: 'Query the knowledge graph for stored facts. You can query by subject, predicate, object, or any combination. Use this to recall what you know about someone or something.',
  parameters: {
    type: 'object',
    properties: {
      subject: {
        type: 'string',
        description: 'Filter by subject entity (optional)'
      },
      predicate: {
        type: 'string',
        description: 'Filter by relationship type (optional)'
      },
      object: {
        type: 'string',
        description: 'Filter by object entity (optional)'
      }
    }
  },
  handler: async (args) => {
    const kg = getKnowledgeGraph();
    const results = kg.query({
      subject: args.subject as string | undefined,
      predicate: args.predicate as Predicate | undefined,
      object: args.object as string | undefined
    });

    if (results.length === 0) {
      return {
        success: true,
        message: 'Aucun fait trouve pour cette requete.',
        results: [],
        count: 0
      };
    }

    return {
      success: true,
      results: results.map(t => ({
        subject: t.subject,
        predicate: t.predicate,
        object: t.object
      })),
      count: results.length
    };
  }
};

// ============================================================================
// Knowledge Search Tool
// ============================================================================

const knowledgeSearchTool: ToolDefinition = {
  name: 'knowledge_search',
  description: 'Search the knowledge graph by keyword. Searches across all subjects, predicates, objects, and metadata. Use this when you want to find anything related to a topic.',
  parameters: {
    type: 'object',
    properties: {
      keyword: {
        type: 'string',
        description: 'The keyword to search for across all knowledge'
      }
    },
    required: ['keyword']
  },
  handler: async (args) => {
    const kg = getKnowledgeGraph();
    const keyword = args.keyword as string;
    const results = kg.search(keyword);

    if (results.length === 0) {
      return {
        success: true,
        message: `Aucun resultat pour "${keyword}".`,
        results: [],
        count: 0
      };
    }

    return {
      success: true,
      results: results.map(t => ({
        subject: t.subject,
        predicate: t.predicate,
        object: t.object
      })),
      count: results.length
    };
  }
};

// ============================================================================
// Knowledge Neighbors Tool
// ============================================================================

const knowledgeNeighborsTool: ToolDefinition = {
  name: 'knowledge_about',
  description: 'Get everything known about a specific entity. Returns all facts where the entity appears as subject or object. Use this to build a complete picture of a person, project, or concept.',
  parameters: {
    type: 'object',
    properties: {
      entity: {
        type: 'string',
        description: 'The entity to look up (e.g., "Patrick", "Lisa", "React")'
      }
    },
    required: ['entity']
  },
  handler: async (args) => {
    const kg = getKnowledgeGraph();
    const entity = args.entity as string;
    const neighbors = kg.neighbors(entity);

    if (neighbors.length === 0) {
      return {
        success: true,
        message: `Rien de connu sur "${entity}".`,
        facts: [],
        count: 0
      };
    }

    return {
      success: true,
      entity,
      facts: neighbors.map(t => ({
        subject: t.subject,
        predicate: t.predicate,
        object: t.object
      })),
      count: neighbors.length
    };
  }
};

// ============================================================================
// Registration
// ============================================================================

export function getKnowledgeTools(): ToolDefinition[] {
  return [knowledgeStoreTool, knowledgeQueryTool, knowledgeSearchTool, knowledgeNeighborsTool];
}

export function registerKnowledgeTools(): void {
  for (const tool of getKnowledgeTools()) {
    toolCallingService.registerTool(tool);
  }
  console.log('[KnowledgeTools] Knowledge graph tools registered');
}
