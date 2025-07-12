/**
 * @file React component for the Wind Forecast node in the workflow editor.
 * This node provides a UI to interact with the WindsurfAgent's getForecast method.
 */

import React, { useState, memo } from 'react';
import { Handle, Position } from 'reactflow';

// --- Node Component ---

const WindForecastNode = ({ data }: { data: any }) => {
  // Data passed from the workflow, including results from previous nodes
  const [spotId, setSpotId] = useState(data.spotId || 'tarifa');
  const [forecastResult, setForecastResult] = useState(data.forecast || null);

  // In a real app, a 'run' button would trigger the WorkflowExecutor
  // which would call the WindsurfAgent and update this node's data.

  return (
    <div style={{ 
      border: '1px solid #1E88E5', 
      borderRadius: '8px', 
      padding: '10px', 
      background: '#FFF', 
      width: '250px' 
    }}>
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 'bold', color: '#1E88E5', marginBottom: '10px' }}>
        Wind Forecast
      </div>
      <label style={{ display: 'block', marginBottom: '5px' }}>
        Spot ID:
        <input 
          type="text" 
          value={spotId}
          onChange={(e) => setSpotId(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', marginTop: '3px' }}
        />
      </label>
      {forecastResult && (
        <div style={{ marginTop: '10px', background: '#F3F3F3', padding: '8px', borderRadius: '4px' }}>
          <div><strong>Wind:</strong> {forecastResult.windSpeedKots} kts</div>
          <div><strong>Direction:</strong> {forecastResult.windDirection}°</div>
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(WindForecastNode);
