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
    <div className="robot-control-panel">
      <h3>🤖 Contrôle Robot</h3>
      
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
          <div className="error-message">
            ⚠️ {error}
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
          onKeyPress={(e) => e.key === 'Enter' && handleSay()}
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
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          max-width: 400px;
        }

        .status-panel {
          background: white;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 15px;
          border: 1px solid #e9ecef;
        }

        .connection-status {
          font-weight: bold;
          margin-bottom: 10px;
        }

        .connection-status.connected {
          color: #28a745;
        }

        .connection-status.disconnected {
          color: #dc3545;
        }

        .robot-status p {
          margin: 5px 0;
          font-size: 14px;
        }

        .error-message {
          color: #dc3545;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
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
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.2s;
        }

        .move-button {
          background: #007bff;
          color: white;
        }

        .move-button:hover:not(:disabled) {
          background: #0056b3;
        }

        .stop-button.emergency {
          background: #dc3545;
          color: white;
        }

        .stop-button.emergency:hover:not(:disabled) {
          background: #c82333;
        }

        .refresh-button {
          background: #6c757d;
          color: white;
        }

        .refresh-button:hover:not(:disabled) {
          background: #545b62;
        }

        .control-buttons button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .speech-control {
          display: flex;
          gap: 10px;
        }

        .speech-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
        }

        .speech-input:focus {
          outline: none;
          border-color: #80bdff;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }

        .speak-button {
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px 15px;
          cursor: pointer;
          font-weight: bold;
        }

        .speak-button:hover:not(:disabled) {
          background: #218838;
        }

        .speak-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
