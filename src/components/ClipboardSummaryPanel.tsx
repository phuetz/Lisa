import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { useClipboardSummarizer } from '../hooks/useClipboardSummarizer';

export function ClipboardSummaryPanel() {
  const { t } = useTranslation();
  const clipboardSummary = useAppStore(state => state.clipboardSummary);
  const isMonitoringEnabled = useAppStore(state => state.clipboardMonitoringEnabled);
  const { isSummarizing, toggleClipboardMonitoring, summarizeClipboard } = useClipboardSummarizer();
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle manual summarize request
  const handleSummarizeClick = async () => {
    await summarizeClipboard();
  };

  // Toggle monitoring
  const handleToggleMonitoring = () => {
    toggleClipboardMonitoring();
  };

  // Toggle panel expansion
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="clipboard-summary-panel">
      <div className="panel-header" onClick={toggleExpand}>
        <h3>
          <i className="fas fa-clipboard"></i> {t('Clipboard Summary')}
          {isSummarizing && <span className="loading-indicator"> (Processing...)</span>}
        </h3>
        <button className="expand-toggle">
          {isExpanded ? <i className="fas fa-chevron-up"></i> : <i className="fas fa-chevron-down"></i>}
        </button>
      </div>

      {isExpanded && (
        <div className="panel-content">
          <div className="controls">
            <button 
              className="primary-button" 
              onClick={handleSummarizeClick}
            >
              <i className="fas fa-sync"></i> {t('Summarize Now')}
            </button>
            
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={isMonitoringEnabled} 
                onChange={handleToggleMonitoring}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">
                {isMonitoringEnabled ? t('Auto-monitoring On') : t('Auto-monitoring Off')}
              </span>
            </label>
          </div>

          <div className="summary-content">
            {clipboardSummary ? (
              <div className="summary-card">
                <h4>{t('Summary')}:</h4>
                <p>{clipboardSummary}</p>
              </div>
            ) : (
              <div className="empty-state">
                <p>
                  {t('No summary available. Copy text to clipboard and click "Summarize Now" or enable auto-monitoring.')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .clipboard-summary-panel {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          margin: 10px 0;
          backdrop-filter: blur(10px);
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
          user-select: none;
          background: rgba(255, 255, 255, 0.05);
        }
        
        .panel-header h3 {
          margin: 0;
          font-size: 1rem;
          display: flex;
          align-items: center;
        }
        
        .panel-header h3 i {
          margin-right: 8px;
        }
        
        .loading-indicator {
          font-size: 0.8rem;
          opacity: 0.7;
          font-style: italic;
          margin-left: 8px;
        }
        
        .expand-toggle {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 0.8rem;
        }
        
        .panel-content {
          padding: 16px;
        }
        
        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .primary-button {
          background: linear-gradient(135deg, #6e8efb, #a777e3);
          border: none;
          border-radius: 4px;
          color: white;
          padding: 8px 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          font-weight: 500;
        }
        
        .primary-button i {
          margin-right: 8px;
        }
        
        .toggle-switch {
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .toggle-slider {
          position: relative;
          display: inline-block;
          width: 36px;
          height: 18px;
          background-color: #ccc;
          border-radius: 18px;
          margin-right: 8px;
          transition: .4s;
        }
        
        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 14px;
          width: 14px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          border-radius: 50%;
          transition: .4s;
        }
        
        input:checked + .toggle-slider {
          background-color: #6e8efb;
        }
        
        input:checked + .toggle-slider:before {
          transform: translateX(18px);
        }
        
        .toggle-label {
          font-size: 0.8rem;
        }
        
        .summary-content {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          padding: 12px;
          max-height: 200px;
          overflow-y: auto;
        }
        
        .summary-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          padding: 8px 12px;
        }
        
        .summary-card h4 {
          margin: 0 0 8px 0;
          font-size: 0.9rem;
          opacity: 0.8;
        }
        
        .summary-card p {
          margin: 0;
          line-height: 1.5;
        }
        
        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          text-align: center;
          font-style: italic;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}
