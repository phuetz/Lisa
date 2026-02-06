/**
 * AppOverlays - Global UI overlays for Lisa
 *
 * Renders all global overlay components:
 * - Toast notifications (Sonner)
 * - Error toast container
 * - Microphone indicator
 * - Vision overlays
 * - Fall detection alerts
 */

import { Toaster } from 'sonner';
import MicIndicator from '../MicIndicator';
import { VisionOverlay } from '../vision/VisionOverlay';
import { SdkVisionMonitor } from '../SdkVisionMonitor';
import { FallDetectorBadge, FallAlert } from '../health/FallAlert';
import { ErrorToastContainer } from '../ui/ErrorToast';
import type { FallDetectionEvent } from '../../features/health/types';

export interface AppOverlaysProps {
  isMobile: boolean;
  lastEvent: FallDetectionEvent | null;
  onDismiss: () => void;
  onConfirm: (event: FallDetectionEvent) => void;
}

export function AppOverlays({
  isMobile,
  lastEvent,
  onDismiss,
  onConfirm,
}: AppOverlaysProps) {
  return (
    <>
      {/* Toast notifications */}
      <Toaster />

      {/* Error toast container */}
      <ErrorToastContainer />

      {/* Microphone indicator */}
      <MicIndicator />

      {/* Vision overlays - hidden on mobile */}
      {!isMobile && <VisionOverlay />}
      {!isMobile && <SdkVisionMonitor />}

      {/* Fall detection - overlay only */}
      <FallDetectorBadge />
      {lastEvent && (
        <FallAlert event={lastEvent} onDismiss={onDismiss} onConfirm={onConfirm} />
      )}
    </>
  );
}
