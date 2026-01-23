import { BaseAgent as IBaseAgent, AgentDomain, AgentExecuteProps, AgentExecuteResult } from './types';

/**
 * Base abstract class for Agents.
 * Provides standard property initialization.
 */
export abstract class BaseAgent implements IBaseAgent {
  public name: string;
  public description: string;
  public version: string;
  public domain: AgentDomain;
  public capabilities: string[] = [];
  public requiresAuthentication = false;

  constructor(name: string, description: string, version: string, domain: AgentDomain) {
    this.name = name;
    this.description = description;
    this.version = version;
    this.domain = domain;
  }

  abstract execute(props: AgentExecuteProps): Promise<AgentExecuteResult>;
}
