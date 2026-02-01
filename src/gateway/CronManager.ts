/**
 * Lisa Cron Manager
 * Scheduled tasks and automation inspired by OpenClaw's cron system
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';
import { getGateway } from './GatewayServer';

export interface CronJob {
  id: string;
  name: string;
  schedule: string; // Cron expression (e.g., "0 9 * * *" for 9am daily)
  enabled: boolean;
  action: CronAction;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CronAction {
  type: 'message' | 'tool' | 'webhook' | 'agent';
  config: CronActionConfig;
}

export type CronActionConfig = 
  | MessageActionConfig
  | ToolActionConfig
  | WebhookActionConfig
  | AgentActionConfig;

export interface MessageActionConfig {
  sessionId: string;
  content: string;
}

export interface ToolActionConfig {
  toolId: string;
  parameters: Record<string, unknown>;
  sessionId?: string;
}

export interface WebhookActionConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
}

export interface AgentActionConfig {
  agentId: string;
  task: string;
  context?: Record<string, unknown>;
}

export interface CronSchedule {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

// Predefined schedules
export const PREDEFINED_SCHEDULES = {
  everyMinute: '* * * * *',
  every5Minutes: '*/5 * * * *',
  every15Minutes: '*/15 * * * *',
  everyHour: '0 * * * *',
  everyDay9am: '0 9 * * *',
  everyDay6pm: '0 18 * * *',
  everyMonday9am: '0 9 * * 1',
  everyFirstOfMonth: '0 9 1 * *',
  weekdaysOnly9am: '0 9 * * 1-5',
} as const;

export class CronManager extends BrowserEventEmitter {
  private jobs: Map<string, CronJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  // Lifecycle
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Check every minute for jobs to run
    this.checkInterval = setInterval(() => {
      this.checkAndRunJobs();
    }, 60000);

    // Initial check
    this.checkAndRunJobs();
    
    console.log('[Cron] Manager started');
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    
    console.log('[Cron] Manager stopped');
  }

  // Job Management
  createJob(config: Omit<CronJob, 'id' | 'lastRun' | 'nextRun' | 'runCount' | 'createdAt'>): CronJob {
    const id = `cron_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    
    const job: CronJob = {
      id,
      ...config,
      runCount: 0,
      createdAt: new Date(),
      nextRun: this.calculateNextRun(config.schedule)
    };

    this.jobs.set(id, job);
    this.emit('job:created', job);
    
    console.log(`[Cron] Job created: ${job.name} (${job.schedule})`);
    
    return job;
  }

  updateJob(id: string, updates: Partial<Omit<CronJob, 'id' | 'createdAt'>>): CronJob | null {
    const job = this.jobs.get(id);
    if (!job) return null;

    Object.assign(job, updates);
    
    if (updates.schedule) {
      job.nextRun = this.calculateNextRun(updates.schedule);
    }

    this.emit('job:updated', job);
    return job;
  }

  deleteJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    this.jobs.delete(id);
    
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.emit('job:deleted', { id });
    return true;
  }

  getJob(id: string): CronJob | undefined {
    return this.jobs.get(id);
  }

  listJobs(filter?: { enabled?: boolean }): CronJob[] {
    let jobs = Array.from(this.jobs.values());
    
    if (filter?.enabled !== undefined) {
      jobs = jobs.filter(j => j.enabled === filter.enabled);
    }
    
    return jobs;
  }

  enableJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    
    job.enabled = true;
    job.nextRun = this.calculateNextRun(job.schedule);
    this.emit('job:enabled', job);
    return true;
  }

  disableJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    
    job.enabled = false;
    this.emit('job:disabled', job);
    return true;
  }

  // Execution
  private checkAndRunJobs(): void {
    const now = new Date();
    
    this.jobs.forEach(job => {
      if (!job.enabled || !job.nextRun) return;
      
      if (now >= job.nextRun) {
        this.executeJob(job);
      }
    });
  }

  async executeJob(job: CronJob): Promise<void> {
    console.log(`[Cron] Executing job: ${job.name}`);
    
    const startTime = Date.now();
    
    try {
      await this.runAction(job.action);
      
      job.lastRun = new Date();
      job.runCount++;
      job.nextRun = this.calculateNextRun(job.schedule);
      
      this.emit('job:executed', {
        job,
        success: true,
        duration: Date.now() - startTime
      });
      
    } catch (error) {
      this.emit('job:failed', {
        job,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      });
    }
  }

  private async runAction(action: CronAction): Promise<void> {
    const gateway = getGateway();

    switch (action.type) {
      case 'message': {
        const config = action.config as MessageActionConfig;
        await gateway.sendMessage(config.sessionId, {
          content: config.content,
          role: 'system'
        });
        break;
      }
      
      case 'tool': {
        const config = action.config as ToolActionConfig;
        await gateway.invokeTool({
          toolId: config.toolId,
          parameters: config.parameters,
          sessionId: config.sessionId || 'cron-system'
        });
        break;
      }
      
      case 'webhook': {
        const config = action.config as WebhookActionConfig;
        await fetch(config.url, {
          method: config.method,
          headers: {
            'Content-Type': 'application/json',
            ...config.headers
          },
          body: config.body ? JSON.stringify(config.body) : undefined
        });
        break;
      }
      
      case 'agent': {
        const config = action.config as AgentActionConfig;
        // Create a temporary session for the agent task
        const session = await gateway.createSession('cron-system', 'api', {
          customPrompt: `Execute task: ${config.task}`
        });
        await gateway.sendMessage(session.id, {
          content: config.task,
          role: 'user'
        });
        break;
      }
    }
  }

  // Schedule Parsing
  private calculateNextRun(schedule: string): Date {
    const parts = schedule.split(' ');
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: ${schedule}`);
    }

    const [minute, hour, dayOfMonth, month, _dayOfWeek] = parts;
    const now = new Date();
    const next = new Date(now);

    // Simple implementation - find next matching time
    // For production, use a proper cron parser library

    // Parse minute
    if (minute !== '*') {
      const targetMinute = parseInt(minute.replace('*/', ''));
      if (minute.startsWith('*/')) {
        // Every N minutes
        const interval = targetMinute;
        const currentMinute = next.getMinutes();
        const nextMinute = Math.ceil((currentMinute + 1) / interval) * interval;
        if (nextMinute >= 60) {
          next.setHours(next.getHours() + 1);
          next.setMinutes(nextMinute % 60);
        } else {
          next.setMinutes(nextMinute);
        }
      } else {
        next.setMinutes(targetMinute);
        if (next <= now) {
          next.setHours(next.getHours() + 1);
        }
      }
    }

    // Parse hour
    if (hour !== '*') {
      const targetHour = parseInt(hour);
      next.setHours(targetHour);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
    }

    // Parse day of month
    if (dayOfMonth !== '*') {
      const targetDay = parseInt(dayOfMonth);
      next.setDate(targetDay);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
    }

    // Parse month
    if (month !== '*') {
      const targetMonth = parseInt(month) - 1; // 0-indexed
      next.setMonth(targetMonth);
      if (next <= now) {
        next.setFullYear(next.getFullYear() + 1);
      }
    }

    // Reset seconds
    next.setSeconds(0);
    next.setMilliseconds(0);

    return next;
  }

  parseCronExpression(expression: string): CronSchedule {
    const parts = expression.split(' ');
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: ${expression}`);
    }

    return {
      minute: parts[0],
      hour: parts[1],
      dayOfMonth: parts[2],
      month: parts[3],
      dayOfWeek: parts[4]
    };
  }

  // Quick job creators
  createDailyJob(name: string, hour: number, minute: number, action: CronAction): CronJob {
    return this.createJob({
      name,
      schedule: `${minute} ${hour} * * *`,
      enabled: true,
      action
    });
  }

  createWeeklyJob(name: string, dayOfWeek: number, hour: number, action: CronAction): CronJob {
    return this.createJob({
      name,
      schedule: `0 ${hour} * * ${dayOfWeek}`,
      enabled: true,
      action
    });
  }

  createIntervalJob(name: string, intervalMinutes: number, action: CronAction): CronJob {
    return this.createJob({
      name,
      schedule: `*/${intervalMinutes} * * * *`,
      enabled: true,
      action
    });
  }

  // Stats
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    totalRuns: number;
  } {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      enabled: jobs.filter(j => j.enabled).length,
      disabled: jobs.filter(j => !j.enabled).length,
      totalRuns: jobs.reduce((sum, j) => sum + j.runCount, 0)
    };
  }
}

// Singleton
let cronManagerInstance: CronManager | null = null;

export function getCronManager(): CronManager {
  if (!cronManagerInstance) {
    cronManagerInstance = new CronManager();
  }
  return cronManagerInstance;
}

export function resetCronManager(): void {
  if (cronManagerInstance) {
    cronManagerInstance.stop();
    cronManagerInstance.removeAllListeners();
    cronManagerInstance = null;
  }
}

