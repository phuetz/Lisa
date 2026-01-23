import type { VisionPayload } from '../types'; // Global types
import type { SdkVisualPercept } from '../types'; // Local shared types

/**
 * Adapts the new SDK standard Visual Percept to the Legacy VisionPayload format.
 * Pure function: No side effects.
 */
export function adapterSdkToLegacy(sdkPercept: SdkVisualPercept): VisionPayload {
  const { objects } = sdkPercept.payload;
  
  return {
    type: 'object',
    boxes: objects.map(o => o.bbox), 
    classes: objects.map(o => o.label),
    scores: objects.map(o => o.confidence)
  };
}
