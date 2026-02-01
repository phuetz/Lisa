import React from 'react';
import { useVisionStore, visionSelectors } from '../../store/visionStore';
import { useUiStore, uiSelectors } from '../../store/uiStore';

// Helper to validate bounding box coordinates
const isValidBox = (box: unknown): box is [number, number, number, number] => {
  if (!Array.isArray(box) || box.length !== 4) return false;
  return box.every(v => typeof v === 'number' && isFinite(v) && v >= 0 && v <= 1);
};

// Helper to validate landmark coordinates
const isValidLandmark = (lm: unknown): lm is { x: number; y: number } => {
  if (!lm || typeof lm !== 'object') return false;
  const l = lm as { x?: unknown; y?: unknown };
  return typeof l.x === 'number' && typeof l.y === 'number' &&
    isFinite(l.x) && isFinite(l.y) &&
    l.x >= 0 && l.x <= 1 && l.y >= 0 && l.y <= 1;
};

/**
 * VisionOverlay - Real-time overlay for object detection and pose landmarks
 * Only renders when vision is enabled AND there are recent valid percepts with valid data
 * Uses facade stores for better separation of concerns.
 */
export const VisionOverlay: React.FC = () => {
  const percepts = useVisionStore(visionSelectors.percepts);
  const advancedVision = useUiStore(uiSelectors.isAdvancedVisionEnabled);

  // Only show overlay when vision is enabled
  if (!advancedVision) return null;

  // Filter only recent vision percepts (last 200ms to avoid stale data)
  const recentVisionPercepts = percepts.filter(
    p => p.modality === 'vision' && p.ts > Date.now() - 200
  );

  // Don't render if no recent percepts - this prevents ghost overlays when camera is off
  if (recentVisionPercepts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: 100,
    }}>
      <svg width="100%" height="100%" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice">
        {recentVisionPercepts.map((percept, idx) => {
          const payload = percept.payload as unknown as Record<string, unknown>;

          // Object Detection - validate boxes before rendering
          if (payload.type === 'object' && Array.isArray(payload.boxes)) {
            const boxes = payload.boxes as unknown[];
            const classes = (payload.classes as string[]) || [];
            const scores = (payload.scores as number[]) || [];

            return boxes
              .filter(isValidBox)
              .map((box, i) => {
                const xMin = box[0] * 640;
                const yMin = box[1] * 360;
                const xMax = box[2] * 640;
                const yMax = box[3] * 360;
                const label = classes[i] || 'unknown';
                const score = scores[i] || 0;

                return (
                  <g key={`obj-${idx}-${i}`}>
                    <rect
                      x={xMin}
                      y={yMin}
                      width={xMax - xMin}
                      height={yMax - yMin}
                      fill="none"
                      stroke="#00ffff"
                      strokeWidth="2"
                    />
                    <text
                      x={xMin}
                      y={yMin - 5}
                      fill="#00ffff"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {label} ({(score * 100).toFixed(0)}%)
                    </text>
                  </g>
                );
              });
          }

          // Pose Detection - validate landmarks before rendering
          if (payload.type === 'pose' && Array.isArray(payload.landmarks)) {
            const landmarks = (payload.landmarks as unknown[]).filter(isValidLandmark);
            if (landmarks.length === 0) return null;

            return (
              <g key={`pose-${idx}`}>
                {landmarks.map((lm, i) => (
                  <circle
                    key={`lm-${i}`}
                    cx={lm.x * 640}
                    cy={lm.y * 360}
                    r="2"
                    fill="#ff00ff"
                  />
                ))}
              </g>
            );
          }

          // Face Detection
          if (payload.type === 'face' && Array.isArray(payload.boxes)) {
            const boxes = (payload.boxes as unknown[]).filter(isValidBox);
            const landmarks = Array.isArray(payload.landmarks) ? (payload.landmarks as unknown[]).filter(isValidLandmark) : [];

            return (
              <g key={`face-${idx}`}>
                {boxes.map((box, i) => (
                  <rect
                    key={`face-box-${i}`}
                    x={box[0] * 640}
                    y={box[1] * 360}
                    width={(box[2] - box[0]) * 640}
                    height={(box[3] - box[1]) * 360}
                    fill="none"
                    stroke="#ff66ff"
                    strokeWidth="1"
                    strokeDasharray="4"
                  />
                ))}
                {landmarks.map((lm, i) => (
                  <circle
                    key={`face-lm-${i}`}
                    cx={lm.x * 640}
                    cy={lm.y * 360}
                    r="1"
                    fill="#ff66ff"
                  />
                ))}
              </g>
            );
          }

          // Hand Detection
          if (payload.type === 'hand' && Array.isArray(payload.boxes)) {
            const boxes = (payload.boxes as unknown[]).filter(isValidBox);
            const landmarks = Array.isArray(payload.landmarks) ? (payload.landmarks as unknown[]).filter(isValidLandmark) : [];
            const handedness = payload.handedness as string;

            return (
              <g key={`hand-${idx}`}>
                {boxes.map((box, i) => (
                  <g key={`hand-box-group-${i}`}>
                    <rect
                      x={box[0] * 640}
                      y={box[1] * 360}
                      width={(box[2] - box[0]) * 640}
                      height={(box[3] - box[1]) * 360}
                      fill="none"
                      stroke="#ffff00"
                      strokeWidth="1"
                    />
                    <text
                      x={box[0] * 640}
                      y={box[1] * 360 - 2}
                      fill="#ffff00"
                      fontSize="10"
                    >
                      {handedness} Hand
                    </text>
                  </g>
                ))}
                {landmarks.map((lm, i) => (
                  <circle
                    key={`hand-lm-${i}`}
                    cx={lm.x * 640}
                    cy={lm.y * 360}
                    r="1.5"
                    fill="#ffff00"
                  />
                ))}
              </g>
            );
          }

          return null;
        })}
      </svg>
    </div>
  );
};
