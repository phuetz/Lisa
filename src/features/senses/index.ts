/**
 * Lisa Senses Module - Unified access to 5 senses
 *
 * This module provides the SenseCoordinator for unified sense management.
 *
 * @example
 * ```typescript
 * import { senseCoordinator } from '@/features/senses';
 *
 * // Initialize all senses
 * await senseCoordinator.initialize();
 *
 * // Subscribe to all percepts
 * senseCoordinator.subscribeAll((percept) => {
 *   console.log(percept.modality, percept.payload);
 * });
 *
 * // Subscribe to specific sense
 * const unsubscribe = senseCoordinator.subscribe('vision', (percept) => {
 *   console.log('Vision detected:', percept.payload);
 * });
 *
 * // Check health
 * const health = senseCoordinator.getHealthStatus();
 * ```
 */

// Main coordinator
export { SenseCoordinator, senseCoordinator } from './SenseCoordinator';

// Types
export type {
  Sense,
  SenseConfig,
  SensesConfig,
  SenseHealthStatus,
  SenseStatus,
  PerceptCallback,
  AnyPerceptCallback,
  Unsubscribe,
  SenseCoordinatorEvent,
  SenseCoordinatorEventData,
  // Re-exported percept types
  Percept,
  AnyPercept,
  SenseModality,
  VisionPercept,
  VisionPayload,
  HearingPercept,
  HearingPayload,
  TouchPercept,
  TouchPayload,
  EnvironmentPercept,
  EnvironmentPayload,
  ProprioceptionPercept,
  ProprioceptionPayload,
} from './types';
