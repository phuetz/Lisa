import React from 'react';
import type { VisionPercept } from '../types';

export interface VisionOverlayProps {
  percepts: VisionPercept[];
  width?: number;
  height?: number;
  showLabels?: boolean;
  color?: string;
}

export const VisionOverlay: React.FC<VisionOverlayProps> = ({ 
  percepts, 
  width = 640, 
  height = 360,
  showLabels = true,
  color = '#00ffff'
}) => {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 10
    }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice">
        {percepts.map((percept, idx) => {
          const { payload } = percept;
          if (payload.type === 'object' && payload.boxes) {
            return payload.boxes.map((box, i) => {
              const [xMin, yMin, xMax, yMax] = box;
              const label = payload.classes?.[i] || 'unknown';
              const score = payload.scores?.[i] || 0;
              
              return (
                <g key={`obj-${idx}-${i}`}>
                  <rect
                    x={xMin}
                    y={yMin}
                    width={xMax - xMin}
                    height={yMax - yMin}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                  />
                  {showLabels && (
                    <text
                      x={xMin}
                      y={yMin - 5}
                      fill={color}
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {label} ({(score * 100).toFixed(0)}%)
                    </text>
                  )}
                </g>
              );
            });
          }
          return null;
        })}
      </svg>
    </div>
  );
};
