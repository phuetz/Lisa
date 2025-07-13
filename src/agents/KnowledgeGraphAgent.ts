import { AgentDomains } from './types';
import type {
  AgentCapability,
  AgentExecuteProps,
  AgentExecuteResult,
  AgentParameter,
  BaseAgent
} from './types';
import * as jsonld from 'jsonld';
import { Store, DataFactory } from 'n3';
const { namedNode, literal, quad } = DataFactory;

export type KnowledgeGraphAction = 'add_entity' | 'add_relationship' | 'query' | 'delete_entity' | 'delete_relationship';

export interface Entity {
  id: string;
  type: string;
  properties: Record<string, any>;
}

export interface Relationship {
  subject: string;
  predicate: string;
  object: string;
}

export class KnowledgeGraphAgent implements BaseAgent {
  name = 'KnowledgeGraphAgent';
  description = 'Manages a knowledge graph for Lisa, storing and querying entities and relationships.';
  version = '1.0.0';
  domain = AgentDomains.KNOWLEDGE;
  capabilities = ['add_entity', 'add_relationship', 'query_graph'];

  private store: Store;

  constructor() {
    this.store = new Store();
  }

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const action = props.action as KnowledgeGraphAction;
    const parameters = props.parameters || {};

    try {
      let resultOutput: any;

      switch (action) {
        case 'add_entity':
          if (!parameters.entity) {
            throw new Error('Entity data is required to add an entity.');
          }
          resultOutput = this.addEntity(parameters.entity);
          break;

        case 'add_relationship':
          if (!parameters.relationship) {
            throw new Error('Relationship data is required to add a relationship.');
          }
          resultOutput = this.addRelationship(parameters.relationship);
          break;

        case 'query':
          if (!parameters.query) {
            throw new Error('Query is required to query the knowledge graph.');
          }
          resultOutput = this.queryGraph(parameters.query);
          break;

        case 'delete_entity':
          if (!parameters.entityId) {
            throw new Error('Entity ID is required to delete an entity.');
          }
          resultOutput = this.deleteEntity(parameters.entityId);
          break;

        case 'delete_relationship':
          if (!parameters.relationship) {
            throw new Error('Relationship data is required to delete a relationship.');
          }
          resultOutput = this.deleteRelationship(parameters.relationship);
          break;

        default:
          return { success: false, error: `Unknown KnowledgeGraph action: ${action}`, output: null };
      }

      return {
        success: true,
        output: resultOutput,
        metadata: {
          executionTime: Date.now() - startTime,
          action: action,
        },
      };
    } catch (error: any) {
      console.error(`${this.name} execution error for action ${action}:`, error);
      return {
        success: false,
        error: error.message || 'An unknown error occurred during KnowledgeGraph action.',
        output: null,
        metadata: {
          executionTime: Date.now() - startTime,
          action: action,
        },
      };
    }
  }

  private addEntity(entity: Entity): boolean {
    const subject = namedNode(entity.id);
    this.store.add(quad(subject, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode(entity.type)));
    for (const prop in entity.properties) {
      this.store.add(quad(subject, namedNode(`http://example.org/ontology/${prop}`), literal(entity.properties[prop])));
    }
    return true;
  }

  private addRelationship(relationship: Relationship): boolean {
    this.store.add(quad(namedNode(relationship.subject), namedNode(relationship.predicate), namedNode(relationship.object)));
    return true;
  }

  private queryGraph(query: string): any[] {
    // This is a very basic query implementation. A full implementation would use SPARQL.
    const results: any[] = [];
    this.store.forEach(quad => {
      if (quad.subject.value.includes(query) || quad.predicate.value.includes(query) || quad.object.value.includes(query)) {
        results.push({
          subject: quad.subject.value,
          predicate: quad.predicate.value,
          object: quad.object.value,
        });
      }
    });
    return results;
  }

  private deleteEntity(entityId: string): boolean {
    const subject = namedNode(entityId);
    const quadsToDelete = this.store.getQuads(subject, null, null, null);
    this.store.removeQuads(quadsToDelete);
    return quadsToDelete.length > 0;
  }

  private deleteRelationship(relationship: Relationship): boolean {
    const quadsToDelete = this.store.getQuads(namedNode(relationship.subject), namedNode(relationship.predicate), namedNode(relationship.object), null);
    this.store.removeQuads(quadsToDelete);
    return quadsToDelete.length > 0;
  }

  async canHandle(query: string): Promise<number> {
    const lowerQuery = query.toLowerCase();
    const keywords = ['knowledge graph', 'graph de connaissances', 'entity', 'relation', 'query graph', 'add fact'];
    const matchCount = keywords.filter(keyword => lowerQuery.includes(keyword)).length;
    return matchCount > 0 ? 0.7 : 0;
  }

  async getRequiredParameters(action: string): Promise<AgentParameter[]> {
    switch (action) {
      case 'add_entity':
        return [
          { name: 'entity', type: 'object', required: true, description: 'The entity object to add (id, type, properties).' },
        ];
      case 'add_relationship':
        return [
          { name: 'relationship', type: 'object', required: true, description: 'The relationship object to add (subject, predicate, object).' },
        ];
      case 'query':
        return [
          { name: 'query', type: 'string', required: true, description: 'The query string to search the graph.' },
        ];
      case 'delete_entity':
        return [
          { name: 'entityId', type: 'string', required: true, description: 'The ID of the entity to delete.' },
        ];
      case 'delete_relationship':
        return [
          { name: 'relationship', type: 'object', required: true, description: 'The relationship object to delete (subject, predicate, object).' },
        ];
      default:
        return [];
    }
  }

  async getCapabilities(): Promise<AgentCapability[]> {
    return [
      {
        name: 'add_entity',
        description: 'Adds a new entity to the knowledge graph.',
        requiredParameters: await this.getRequiredParameters('add_entity'),
      },
      {
        name: 'add_relationship',
        description: 'Adds a new relationship between entities in the knowledge graph.',
        requiredParameters: await this.getRequiredParameters('add_relationship'),
      },
      {
        name: 'query_graph',
        description: 'Queries the knowledge graph for entities or relationships.',
        requiredParameters: await this.getRequiredParameters('query'),
      },
      {
        name: 'delete_entity',
        description: 'Deletes an entity from the knowledge graph.',
        requiredParameters: await this.getRequiredParameters('delete_entity'),
      },
      {
        name: 'delete_relationship',
        description: 'Deletes a relationship from the knowledge graph.',
        requiredParameters: await this.getRequiredParameters('delete_relationship'),
      },
    ];
  }
}
