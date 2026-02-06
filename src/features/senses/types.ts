/**
 * Unified Sense Types for Lisa AI
 *
 * These types provide a consistent interface across all 5 senses.
 */

import type { Percept, AnyPercept, SenseModality } from '../../types';

/* ---------- Sense Interface ---------- */

/**
 * Common interface for all senses
 */
export interface Sense {
  /** Unique name of the sense */
  name: SenseModality;

  /** Initialize the sense */
  initialize: (config?: SenseConfig) => Promise<void>;

  /** Start sensing */
  start: () => void;

  /** Stop sensing */
  stop: () => void;

  /** Terminate and cleanup */
  terminate: () => void;

  /** Set callback for percept events */
  setOnPerceptCallback: (cb: PerceptCallback | null) => void;

  /** Check if sense is active */
  isActive?: () => boolean;
}

/* ---------- Callback Types ---------- */

export type PerceptCallback<T = unknown> = (percept: Percept<T>) => void;
export type AnyPerceptCallback = (percept: AnyPercept) => void;
export type Unsubscribe = () => void;

/* ---------- Configuration ---------- */

export interface SenseConfig {
  enabled: boolean;
  sensitivity: number;
  updateInterval: number;
  sources: string[];
}

export interface SensesConfig {
  vision: SenseConfig;
  hearing: SenseConfig;
  touch: SenseConfig;
  environment: SenseConfig;
  proprioception: SenseConfig;
}

/* ---------- Health Status ---------- */

export interface SenseHealthStatus {
  vision: SenseStatus;
  hearing: SenseStatus;
  touch: SenseStatus;
  environment: SenseStatus;
  proprioception: SenseStatus;
}

export interface SenseStatus {
  active: boolean;
  lastPercept: number | null;
  errorCount: number;
  lastError: string | null;
}

/* ---------- Coordinator Events ---------- */

export type SenseCoordinatorEvent =
  | 'initialized'
  | 'terminated'
  | 'sense:started'
  | 'sense:stopped'
  | 'sense:error'
  | 'percept';

export interface SenseCoordinatorEventData {
  initialized: void;
  terminated: void;
  'sense:started': { modality: SenseModality };
  'sense:stopped': { modality: SenseModality };
  'sense:error': { modality: SenseModality; error: Error };
  percept: AnyPercept;
}

/* ---------- Re-exports from main types ---------- */

export type {
  Percept,
  AnyPercept,
  SenseModality,
  // Vision
  VisionPercept,
  VisionPayload,
  // Hearing
  HearingPercept,
  HearingPayload,
  // Touch
  TouchPercept,
  TouchPayload,
  // Environment
  EnvironmentPercept,
  EnvironmentPayload,
  // Proprioception
  ProprioceptionPercept,
  ProprioceptionPayload,
} from '../../types';
