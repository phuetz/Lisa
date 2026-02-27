/**
 * Lisa Canvas Manager (A2UI - Agent to UI)
 * Agent-driven dynamic UI workspace
 * Inspired by OpenClaw's Live Canvas
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';
import { safeEvaluate } from '../features/workflow/executor/SafeEvaluator';

export interface CanvasComponent {
  id: string;
  type: CanvasComponentType;
  props: Record<string, unknown>;
  children?: CanvasComponent[];
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  visible?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CanvasComponentType = 
  | 'text'
  | 'markdown'
  | 'code'
  | 'image'
  | 'chart'
  | 'table'
  | 'form'
  | 'button'
  | 'input'
  | 'card'
  | 'list'
  | 'progress'
  | 'alert'
  | 'modal'
  | 'tabs'
  | 'accordion'
  | 'iframe'
  | 'video'
  | 'audio'
  | 'custom';

export interface CanvasAction {
  type: 'push' | 'update' | 'remove' | 'reset' | 'eval' | 'snapshot';
  componentId?: string;
  component?: Partial<CanvasComponent>;
  script?: string;
}

export interface CanvasState {
  id: string;
  name: string;
  components: CanvasComponent[];
  theme: CanvasTheme;
  layout: CanvasLayout;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CanvasTheme {
  background: string;
  foreground: string;
  accent: string;
  fontFamily: string;
  fontSize: number;
}

export type CanvasLayout = 'free' | 'grid' | 'flex' | 'stack';

export interface CanvasSnapshot {
  stateId: string;
  components: CanvasComponent[];
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

const DEFAULT_THEME: CanvasTheme = {
  background: '#1a1a26',
  foreground: '#ffffff',
  accent: '#3b82f6',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 14
};

export class CanvasManager extends BrowserEventEmitter {
  private states: Map<string, CanvasState> = new Map();
  private activeStateId: string | null = null;
  private snapshots: CanvasSnapshot[] = [];
  private maxSnapshots = 50;

  constructor() {
    super();
    this.createDefaultState();
  }

  private generateId(): string {
    return `canvas_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  private generateComponentId(): string {
    return `comp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  private createDefaultState(): void {
    const state: CanvasState = {
      id: 'default',
      name: 'Main Canvas',
      components: [],
      theme: { ...DEFAULT_THEME },
      layout: 'free',
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.states.set(state.id, state);
    this.activeStateId = state.id;
  }

  // State management
  createState(name: string, layout: CanvasLayout = 'free'): CanvasState {
    const id = this.generateId();
    const state: CanvasState = {
      id,
      name,
      components: [],
      theme: { ...DEFAULT_THEME },
      layout,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.states.set(id, state);
    this.emit('state:created', state);
    return state;
  }

  getState(id?: string): CanvasState | null {
    const stateId = id || this.activeStateId;
    return stateId ? this.states.get(stateId) || null : null;
  }

  setActiveState(id: string): boolean {
    if (!this.states.has(id)) return false;
    this.activeStateId = id;
    this.emit('state:activated', { id });
    return true;
  }

  listStates(): CanvasState[] {
    return Array.from(this.states.values());
  }

  deleteState(id: string): boolean {
    if (id === 'default') return false;
    
    const deleted = this.states.delete(id);
    if (deleted && this.activeStateId === id) {
      this.activeStateId = 'default';
    }
    if (deleted) {
      this.emit('state:deleted', { id });
    }
    return deleted;
  }

  // Component operations (A2UI)
  push(component: Omit<CanvasComponent, 'id' | 'createdAt' | 'updatedAt'>): CanvasComponent | null {
    const state = this.getState();
    if (!state || state.isLocked) return null;

    const newComponent: CanvasComponent = {
      ...component,
      id: this.generateComponentId(),
      visible: component.visible ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    state.components.push(newComponent);
    state.updatedAt = new Date();

    this.emit('component:pushed', newComponent);
    return newComponent;
  }

  update(componentId: string, updates: Partial<CanvasComponent>): boolean {
    const state = this.getState();
    if (!state || state.isLocked) return false;

    const component = state.components.find(c => c.id === componentId);
    if (!component) return false;

    Object.assign(component, updates, { updatedAt: new Date() });
    state.updatedAt = new Date();

    this.emit('component:updated', component);
    return true;
  }

  remove(componentId: string): boolean {
    const state = this.getState();
    if (!state || state.isLocked) return false;

    const index = state.components.findIndex(c => c.id === componentId);
    if (index === -1) return false;

    const removed = state.components.splice(index, 1)[0];
    state.updatedAt = new Date();

    this.emit('component:removed', removed);
    return true;
  }

  reset(stateId?: string): void {
    const state = this.getState(stateId);
    if (!state) return;

    // Save snapshot before reset
    this.snapshot(stateId);

    state.components = [];
    state.updatedAt = new Date();

    this.emit('state:reset', { id: state.id });
  }

  // Component getters
  getComponent(componentId: string): CanvasComponent | null {
    const state = this.getState();
    if (!state) return null;
    return state.components.find(c => c.id === componentId) || null;
  }

  getComponents(filter?: { type?: CanvasComponentType; visible?: boolean }): CanvasComponent[] {
    const state = this.getState();
    if (!state) return [];

    let components = [...state.components];

    if (filter?.type) {
      components = components.filter(c => c.type === filter.type);
    }
    if (filter?.visible !== undefined) {
      components = components.filter(c => c.visible === filter.visible);
    }

    return components;
  }

  // Batch operations
  pushMany(components: Omit<CanvasComponent, 'id' | 'createdAt' | 'updatedAt'>[]): CanvasComponent[] {
    const pushed: CanvasComponent[] = [];
    for (const comp of components) {
      const result = this.push(comp);
      if (result) pushed.push(result);
    }
    return pushed;
  }

  removeMany(componentIds: string[]): number {
    let count = 0;
    for (const id of componentIds) {
      if (this.remove(id)) count++;
    }
    return count;
  }

  // Evaluate script in canvas context
  eval(script: string): unknown {
    const state = this.getState();
    if (!state) return null;

    // Provide canvas context for script evaluation
    const context = {
      components: state.components,
      theme: state.theme,
      layout: state.layout,
      getComponent: (id: string) => this.getComponent(id),
      push: (comp: Omit<CanvasComponent, 'id' | 'createdAt' | 'updatedAt'>) => this.push(comp),
      update: (id: string, updates: Partial<CanvasComponent>) => this.update(id, updates),
      remove: (id: string) => this.remove(id)
    };

    try {
      // Try safe evaluation first for simple expressions (property access, math, comparisons)
      try {
        const result = safeEvaluate(script, context as Record<string, unknown>);
        this.emit('canvas:eval', { script, result });
        return result;
      } catch {
        // SafeEvaluator cannot handle complex scripts with canvas method calls (push, update, remove, etc.)
        // Fall through to return null for unsupported expressions
        this.emit('canvas:eval:error', { script, error: 'Expression not supported by safe evaluator' });
        return null;
      }
    } catch (error) {
      this.emit('canvas:eval:error', { script, error });
      return null;
    }
  }

  // Snapshots
  snapshot(stateId?: string): CanvasSnapshot | null {
    const state = this.getState(stateId);
    if (!state) return null;

    const snap: CanvasSnapshot = {
      stateId: state.id,
      components: JSON.parse(JSON.stringify(state.components)),
      timestamp: new Date()
    };

    this.snapshots.push(snap);
    
    // Trim old snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    this.emit('snapshot:created', snap);
    return snap;
  }

  getSnapshots(stateId?: string): CanvasSnapshot[] {
    if (stateId) {
      return this.snapshots.filter(s => s.stateId === stateId);
    }
    return [...this.snapshots];
  }

  restoreSnapshot(snapshotIndex: number): boolean {
    const snap = this.snapshots[snapshotIndex];
    if (!snap) return false;

    const state = this.states.get(snap.stateId);
    if (!state) return false;

    state.components = JSON.parse(JSON.stringify(snap.components));
    state.updatedAt = new Date();

    this.emit('snapshot:restored', snap);
    return true;
  }

  // Theme
  setTheme(theme: Partial<CanvasTheme>, stateId?: string): void {
    const state = this.getState(stateId);
    if (!state) return;

    state.theme = { ...state.theme, ...theme };
    state.updatedAt = new Date();

    this.emit('theme:changed', state.theme);
  }

  getTheme(stateId?: string): CanvasTheme | null {
    const state = this.getState(stateId);
    return state ? { ...state.theme } : null;
  }

  // Layout
  setLayout(layout: CanvasLayout, stateId?: string): void {
    const state = this.getState(stateId);
    if (!state) return;

    state.layout = layout;
    state.updatedAt = new Date();

    this.emit('layout:changed', { layout });
  }

  // Lock
  lock(stateId?: string): void {
    const state = this.getState(stateId);
    if (state) {
      state.isLocked = true;
      this.emit('state:locked', { id: state.id });
    }
  }

  unlock(stateId?: string): void {
    const state = this.getState(stateId);
    if (state) {
      state.isLocked = false;
      this.emit('state:unlocked', { id: state.id });
    }
  }

  // Execute action
  execute(action: CanvasAction): unknown {
    switch (action.type) {
      case 'push':
        if (action.component) {
          return this.push(action.component as Omit<CanvasComponent, 'id' | 'createdAt' | 'updatedAt'>);
        }
        break;
      case 'update':
        if (action.componentId && action.component) {
          return this.update(action.componentId, action.component);
        }
        break;
      case 'remove':
        if (action.componentId) {
          return this.remove(action.componentId);
        }
        break;
      case 'reset':
        this.reset();
        return true;
      case 'eval':
        if (action.script) {
          return this.eval(action.script);
        }
        break;
      case 'snapshot':
        return this.snapshot();
    }
    return null;
  }

  // Helper methods for common components
  pushText(content: string, options?: Partial<CanvasComponent>): CanvasComponent | null {
    return this.push({
      type: 'text',
      props: { content },
      ...options
    });
  }

  pushMarkdown(content: string, options?: Partial<CanvasComponent>): CanvasComponent | null {
    return this.push({
      type: 'markdown',
      props: { content },
      ...options
    });
  }

  pushCode(code: string, language: string = 'javascript', options?: Partial<CanvasComponent>): CanvasComponent | null {
    return this.push({
      type: 'code',
      props: { code, language },
      ...options
    });
  }

  pushImage(src: string, alt?: string, options?: Partial<CanvasComponent>): CanvasComponent | null {
    return this.push({
      type: 'image',
      props: { src, alt },
      ...options
    });
  }

  pushChart(chartType: string, data: unknown, options?: Partial<CanvasComponent>): CanvasComponent | null {
    return this.push({
      type: 'chart',
      props: { chartType, data },
      ...options
    });
  }

  pushTable(headers: string[], rows: unknown[][], options?: Partial<CanvasComponent>): CanvasComponent | null {
    return this.push({
      type: 'table',
      props: { headers, rows },
      ...options
    });
  }

  pushAlert(message: string, severity: 'info' | 'success' | 'warning' | 'error' = 'info', options?: Partial<CanvasComponent>): CanvasComponent | null {
    return this.push({
      type: 'alert',
      props: { message, severity },
      ...options
    });
  }

  pushProgress(value: number, max: number = 100, label?: string, options?: Partial<CanvasComponent>): CanvasComponent | null {
    return this.push({
      type: 'progress',
      props: { value, max, label },
      ...options
    });
  }

  // Stats
  getStats(): {
    stateCount: number;
    componentCount: number;
    snapshotCount: number;
    activeState: string | null;
  } {
    const state = this.getState();
    return {
      stateCount: this.states.size,
      componentCount: state?.components.length || 0,
      snapshotCount: this.snapshots.length,
      activeState: this.activeStateId
    };
  }
}

// Singleton
let canvasManagerInstance: CanvasManager | null = null;

export function getCanvasManager(): CanvasManager {
  if (!canvasManagerInstance) {
    canvasManagerInstance = new CanvasManager();
  }
  return canvasManagerInstance;
}

export function resetCanvasManager(): void {
  if (canvasManagerInstance) {
    canvasManagerInstance.removeAllListeners();
    canvasManagerInstance = null;
  }
}

