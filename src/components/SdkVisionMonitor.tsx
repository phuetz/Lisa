import React, { useEffect, useState } from 'react';
import { setOnSdkPerceptCallback } from '../features/vision/api';
import type { SdkVisualPercept } from '../senses/types';

/**
 * SdkVisionMonitor (Debug Component)
 * 
 * This component demonstrates "Dogfooding" the new SDK channel.
 * It subscribes to the standardized SDK percepts and displays them,
 * proving that the new architecture works in parallel with the legacy UI.
 */
export const SdkVisionMonitor: React.FC = () => {
  const [lastPercept, setLastPercept] = useState<SdkVisualPercept | null>(null);
  const [objectCount, setObjectCount] = useState(0);

  useEffect(() => {
    // Subscribe to the NEW SDK channel
    setOnSdkPerceptCallback((percept) => {
      setLastPercept(percept);
      setObjectCount(percept.payload.objects.length);
    });

    return () => {
      setOnSdkPerceptCallback(null);
    };
  }, []);

  if (objectCount === 0 && !lastPercept) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: '#00ffcc',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 10000,
      border: '1px solid #00ffcc'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>📡 SDK VISION MONITOR</div>
      <div>Status: Connected</div>
      <div>Objects Detected: {objectCount}</div>
      {lastPercept?.payload.objects.map((obj, i) => (
        <div key={i}>
          • {obj.label} ({Math.round(obj.confidence * 100)}%)
        </div>
      ))}
      <div style={{ fontSize: '10px', marginTop: '5px', opacity: 0.7 }}>
        TS: {lastPercept?.ts}
      </div>
    </div>
  );
};
