/**
 * 🌟 Lisa Vivante - Index Principal
 * Exporte tous les services, composants et hooks du Manifeste Vivant
 */

// ============================================================================
// PHASE 1 - PRÉSENCE
// ============================================================================

// Services Phase 1
export { auditService, type AuditLog, type AuditStats } from '../services/AuditService';
export { initLisaVivante, getLisaState, getLisaStats } from './initLisaVivante';

// Composants Phase 1
export { SensorStatus } from '../components/SensorStatus';
export { SensorPermissionsPanel } from '../components/SensorPermissionsPanel';
export { PrivacyCenter } from '../components/PrivacyCenter';
export { MemoryMap } from '../components/MemoryMap';
export { IncarnationDashboard } from '../components/IncarnationDashboard';
export { AccessibilityWrapper, useAccessibility, ScreenReaderOnly } from '../components/AccessibilityWrapper';
export { AccessibilitySettings } from '../components/AccessibilitySettings';

// ============================================================================
// PHASE 2 - AGENTIVITÉ
// ============================================================================

// Services Phase 2
export { criticAgentV2, type ActionProposal, type ValidationResult, type RiskAssessment } from '../agents/CriticAgentV2';
export { memoryService, type Memory, type MemoryContext, type MemoryStats } from '../services/MemoryService';
export { ragService, type Embedding, type AugmentedContext } from '../services/RAGService';
export { forgetService, type ForgetRequest, type ForgetResult, type ForgetHistory } from '../services/ForgetService';

// Hooks Phase 2
export { usePhase2 } from '../hooks/usePhase2';

// Composants Phase 2
export { Phase2Dashboard } from '../components/Phase2Dashboard';

// ============================================================================
// PHASE 3 - AUTONOMIE
// ============================================================================

// Services Phase 3
export { workflowService, type WorkflowDefinition, type WorkflowExecution, type WorkflowStep } from '../services/WorkflowService';
export { integrationService, type IntegrationConfig, type IntegrationEvent, type IntegrationStatus } from '../services/IntegrationService';

// Hooks Phase 3
export { usePhase3 } from '../hooks/usePhase3';

// Composants Phase 3
export { Phase3Dashboard } from '../components/Phase3Dashboard';

// ============================================================================
// INTÉGRATION COMPLÈTE
// ============================================================================

export { LisaVivanteComplete } from '../components/LisaVivanteComplete';

// ============================================================================
// TYPES GLOBAUX
// ============================================================================

export type { Phase2State } from '../hooks/usePhase2';
export type { Phase3State } from '../hooks/usePhase3';
