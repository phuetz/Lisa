/**
 * Composant de contrôle robot minimal
 */

import React, { useState } from 'react';
import { useRobot } from '../hooks/useRobot';

export const RobotControl: React.FC = () => {
  const { 
    status, 
    isConnected, 
    isLoading, 
    error, 
    moveRobot, 
    sayText, 
    emergencyStop,
    refreshStatus 
  } = useRobot();

  const [textToSay, setTextToSay] = useState('');

  const handleMoveForward = async () => {
    await moveRobot({
      linear: { x: 0.2, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: 0 }
    });
  };

  const handleStop = async () => {
    await emergencyStop();
  };

  const handleSay = async () => {
    if (textToSay.trim()) {
      await sayText(textToSay);
      setTextToSay('');
    }
  };

  return (
    <div className="robot-control-panel" role="region" aria-label="Contrôle Robot">
      <h3>Contrôle Robot</h3>
      
      {/* Status Panel */}
      <div className="status-panel">
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}
        </div>
        
        {status && (
          <div className="robot-status">
            <p><strong>Position:</strong> 
              {status.position ? 
                `x: ${status.position.x.toFixed(2)}, y: ${status.position.y.toFixed(2)}` : 
                'N/A'
              }
            </p>
            <p><strong>Batterie:</strong> {status.battery ? `${status.battery}%` : 'N/A'}</p>
            <p><strong>Dernière MAJ:</strong> {status.lastUpdate.toLocaleTimeString()}</p>
          </div>
        )}
        
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="control-buttons">
        <button 
          onClick={handleMoveForward}
          disabled={!isConnected || isLoading}
          className="move-button"
        >
          {isLoading ? '⏳' : '⬆️'} Avancer
        </button>

        <button 
          onClick={handleStop}
          disabled={!isConnected}
          className="stop-button emergency"
        >
          🛑 Arrêt d'urgence
        </button>

        <button 
          onClick={refreshStatus}
          disabled={isLoading}
          className="refresh-button"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* Speech Control */}
      <div className="speech-control">
        <input
          type="text"
          value={textToSay}
          onChange={(e) => setTextToSay(e.target.value)}
          placeholder="Texte à dire..."
          disabled={!isConnected}
          className="speech-input"
          onKeyDown={(e) => e.key === 'Enter' && handleSay()}
        />
        <button 
          onClick={handleSay}
          disabled={!isConnected || !textToSay.trim() || isLoading}
          className="speak-button"
        >
          🗣️ Parler
        </button>
      </div>

      <style>{`
        .robot-control-panel {
          background: var(--bg-panel, #1a1a26);
          border: 1px solid var(--border-primary, #2d2d44);
          border-radius: var(--radius-md, 8px);
          padding: 20px;
          margin: 20px 0;
          max-width: 400px;
          color: var(--text-primary, #e8e8f0);
          box-shadow: var(--shadow-elevated, 0 4px 20px rgba(0,0,0,0.4));
        }

        .robot-control-panel h3 {
          color: var(--text-primary, #e8e8f0);
        }

        .status-panel {
          background: var(--bg-surface, #12121a);
          border-radius: var(--radius-md, 8px);
          padding: 15px;
          margin-bottom: 15px;
          border: 1px solid var(--border-subtle, #2d2d44);
        }

        .connection-status {
          font-weight: bold;
          margin-bottom: 10px;
        }

        .connection-status.connected {
          color: var(--color-accent, #f5a623);
        }

        .connection-status.disconnected {
          color: var(--color-error, #ef4444);
        }

        .robot-status p {
          margin: 5px 0;
          font-size: 14px;
          color: var(--text-secondary, #9898b0);
        }

        .error-message {
          color: var(--color-error, #ef4444);
          background: var(--color-error-subtle, rgba(239, 68, 68, 0.12));
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-sm, 4px);
          padding: 8px;
          margin-top: 10px;
          font-size: 14px;
        }

        .control-buttons {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .control-buttons button {
          padding: 10px 15px;
          border: none;
          border-radius: var(--radius-md, 8px);
          cursor: pointer;
          font-weight: bold;
          transition: all var(--transition-fast, 0.15s ease);
        }

        .move-button {
          background: var(--color-accent, #f5a623);
          color: #fff;
        }

        .move-button:hover:not(:disabled) {
          background: var(--color-accent-hover, #e6951a);
        }

        .stop-button.emergency {
          background: var(--color-error, #ef4444);
          color: #fff;
        }

        .stop-button.emergency:hover:not(:disabled) {
          background: #dc2626;
        }

        .refresh-button {
          background: var(--bg-tertiary, #1a1a26);
          color: var(--text-secondary, #9898b0);
          border: 1px solid var(--border-primary, #2d2d44);
        }

        .refresh-button:hover:not(:disabled) {
          background: var(--bg-hover, rgba(255,255,255,0.06));
          color: var(--text-primary, #e8e8f0);
        }

        .control-buttons button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .control-buttons button:focus-visible {
          outline: none;
          box-shadow: var(--focus-ring, 0 0 0 2px var(--color-accent));
        }

        .speech-control {
          display: flex;
          gap: 10px;
        }

        .speech-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid var(--border-primary, #2d2d44);
          border-radius: var(--radius-sm, 4px);
          font-size: 14px;
          background: var(--bg-surface, #12121a);
          color: var(--text-primary, #e8e8f0);
        }

        .speech-input::placeholder {
          color: var(--text-muted, #6a6a82);
        }

        .speech-input:focus {
          outline: none;
          border-color: var(--color-accent, #f5a623);
          box-shadow: 0 0 0 2px rgba(16, 163, 127, 0.25);
        }

        .speak-button {
          background: var(--color-accent, #f5a623);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm, 4px);
          padding: 8px 15px;
          cursor: pointer;
          font-weight: bold;
          transition: all var(--transition-fast, 0.15s ease);
        }

        .speak-button:hover:not(:disabled) {
          background: var(--color-accent-hover, #e6951a);
        }

        .speak-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .speak-button:focus-visible {
          outline: none;
          box-shadow: var(--focus-ring, 0 0 0 2px var(--color-accent));
        }
      `}</style>
    </div>
  );
};
