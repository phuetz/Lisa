/**
 * Code Buddy Panel
 *
 * UI for AI-powered computer control, inspired by Open Interpreter.
 * Allows users to give natural language goals and watch the AI perform tasks.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { computerControlService, computer } from '../../services/ComputerControlService';

interface TaskStep {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  action?: string;
  error?: string;
}

interface ExecutionLog {
  timestamp: Date;
  type: 'info' | 'action' | 'error' | 'success';
  message: string;
}

export function CodeBuddyPanel() {
  const [goal, setGoal] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [safeMode, setSafeMode] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Check backend connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await computer.connect();
      setIsConnected(connected);
      addLog(connected ? 'success' : 'info',
        connected
          ? 'Backend connected - Full control available'
          : 'Backend not connected - Limited to screen analysis'
      );
    };
    checkConnection();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = useCallback((type: ExecutionLog['type'], message: string) => {
    setLogs(prev => [...prev, {
      timestamp: new Date(),
      type,
      message
    }]);
  }, []);

  const captureCurrentScreen = async () => {
    addLog('action', 'Capturing screen...');
    const capture = await computer.display.view();
    if (capture) {
      setScreenshot(capture);
      addLog('success', 'Screen captured');
    } else {
      addLog('error', 'Failed to capture screen');
    }
  };

  const executeGoal = async () => {
    if (!goal.trim()) return;

    setIsExecuting(true);
    addLog('info', `Starting goal: "${goal}"`);

    try {
      // Import and use the CodeBuddyAgent
      const { agentRegistry } = await import('../../features/agents/core/registry');
      const result = await agentRegistry.execute('CodeBuddyAgent', {
        command: goal,
        context: {
          safeMode,
          screenshot
        }
      });

      if (result.success) {
        addLog('success', `Goal completed: ${result.output}`);

        // Parse steps if returned
        if (result.data?.steps) {
          setSteps(result.data.steps);
        }
      } else {
        addLog('error', `Goal failed: ${result.error}`);
      }
    } catch (error) {
      addLog('error', `Execution error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const interruptExecution = () => {
    computer.interrupt();
    setIsExecuting(false);
    addLog('info', 'Execution interrupted by user');
  };

  const getLogIcon = (type: ExecutionLog['type']) => {
    switch (type) {
      case 'info': return 'i';
      case 'action': return '>';
      case 'error': return 'x';
      case 'success': return '✓';
    }
  };

  const getLogColor = (type: ExecutionLog['type']) => {
    switch (type) {
      case 'info': return '#8b949e';
      case 'action': return '#58a6ff';
      case 'error': return '#f85149';
      case 'success': return '#3fb950';
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>
          <span style={styles.icon}>🤖</span>
          <span>Code Buddy</span>
        </div>
        <div style={styles.connectionStatus}>
          <span style={{
            ...styles.statusDot,
            backgroundColor: isConnected ? '#3fb950' : '#f0883e'
          }} />
          {isConnected ? 'Full Control' : 'Limited Mode'}
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Goal Input */}
        <div style={styles.inputSection}>
          <label style={styles.label}>What would you like me to do?</label>
          <textarea
            style={styles.textarea}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g., Open Chrome and search for weather in Paris"
            rows={3}
            disabled={isExecuting}
          />

          <div style={styles.controls}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={safeMode}
                onChange={(e) => setSafeMode(e.target.checked)}
                disabled={isExecuting}
              />
              <span>Safe Mode (ask before destructive actions)</span>
            </label>

            <div style={styles.buttons}>
              <button
                style={styles.captureButton}
                onClick={captureCurrentScreen}
                disabled={isExecuting}
              >
                📸 Capture Screen
              </button>

              {isExecuting ? (
                <button
                  style={styles.stopButton}
                  onClick={interruptExecution}
                >
                  ⏹ Stop
                </button>
              ) : (
                <button
                  style={styles.executeButton}
                  onClick={executeGoal}
                  disabled={!goal.trim()}
                >
                  ▶ Execute
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Split View: Screenshot & Logs */}
        <div style={styles.splitView}>
          {/* Screenshot Preview */}
          <div style={styles.screenshotSection}>
            <div style={styles.sectionHeader}>Screen Preview</div>
            <div style={styles.screenshotContainer}>
              {screenshot ? (
                <img
                  src={`data:image/png;base64,${screenshot}`}
                  alt="Current screen"
                  style={styles.screenshotImage}
                />
              ) : (
                <div style={styles.noScreenshot}>
                  <span>No screenshot</span>
                  <span style={styles.hint}>Click "Capture Screen" to see current state</span>
                </div>
              )}
            </div>
          </div>

          {/* Execution Logs */}
          <div style={styles.logsSection}>
            <div style={styles.sectionHeader}>Execution Log</div>
            <div style={styles.logsContainer}>
              {logs.length === 0 ? (
                <div style={styles.noLogs}>No activity yet</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} style={styles.logEntry}>
                    <span style={{
                      ...styles.logIcon,
                      color: getLogColor(log.type)
                    }}>
                      {getLogIcon(log.type)}
                    </span>
                    <span style={styles.logTime}>
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span style={{
                      ...styles.logMessage,
                      color: getLogColor(log.type)
                    }}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* Task Steps */}
        {steps.length > 0 && (
          <div style={styles.stepsSection}>
            <div style={styles.sectionHeader}>Task Progress</div>
            <div style={styles.stepsList}>
              {steps.map((step, i) => (
                <div key={step.id} style={styles.stepItem}>
                  <span style={{
                    ...styles.stepNumber,
                    backgroundColor: step.status === 'completed' ? '#238636' :
                                   step.status === 'running' ? '#1f6feb' :
                                   step.status === 'failed' ? '#da3633' : '#30363d'
                  }}>
                    {i + 1}
                  </span>
                  <div style={styles.stepContent}>
                    <span style={styles.stepDescription}>{step.description}</span>
                    {step.action && (
                      <span style={styles.stepAction}>{step.action}</span>
                    )}
                    {step.error && (
                      <span style={styles.stepError}>{step.error}</span>
                    )}
                  </div>
                  <span style={styles.stepStatus}>
                    {step.status === 'completed' && '✓'}
                    {step.status === 'running' && '...'}
                    {step.status === 'failed' && '✗'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backend Installation Help */}
        {!isConnected && (
          <div style={styles.helpSection}>
            <div style={styles.helpTitle}>Want Full Control?</div>
            <p style={styles.helpText}>
              Install the desktop backend for mouse, keyboard, and full automation:
            </p>
            <code style={styles.codeBlock}>
              pip install lisa-desktop && lisa-desktop
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#0d1117',
    color: '#c9d1d9',
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#161b22',
    borderBottom: '1px solid #30363d',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: 600,
  },
  icon: {
    fontSize: '20px',
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#8b949e',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  content: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#c9d1d9',
  },
  textarea: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#c9d1d9',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#8b949e',
    cursor: 'pointer',
  },
  buttons: {
    display: 'flex',
    gap: '8px',
  },
  captureButton: {
    padding: '8px 16px',
    backgroundColor: '#21262d',
    border: '1px solid #30363d',
    borderRadius: '6px',
    color: '#c9d1d9',
    fontSize: '13px',
    cursor: 'pointer',
  },
  executeButton: {
    padding: '8px 20px',
    backgroundColor: '#238636',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  stopButton: {
    padding: '8px 20px',
    backgroundColor: '#da3633',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  splitView: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    minHeight: '200px',
  },
  screenshotSection: {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #30363d',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: '8px 12px',
    backgroundColor: '#161b22',
    fontSize: '12px',
    fontWeight: 600,
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  screenshotContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#010409',
    minHeight: '150px',
  },
  screenshotImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  noScreenshot: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    color: '#484f58',
    fontSize: '13px',
  },
  hint: {
    fontSize: '11px',
    color: '#30363d',
  },
  logsSection: {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #30363d',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  logsContainer: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#010409',
    overflow: 'auto',
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: '12px',
    minHeight: '150px',
    maxHeight: '300px',
  },
  noLogs: {
    color: '#484f58',
    fontStyle: 'italic',
    padding: '8px',
  },
  logEntry: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '2px 0',
  },
  logIcon: {
    fontWeight: 'bold',
    width: '14px',
    textAlign: 'center',
  },
  logTime: {
    color: '#484f58',
    fontSize: '11px',
  },
  logMessage: {
    flex: 1,
  },
  stepsSection: {
    border: '1px solid #30363d',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  stepsList: {
    padding: '8px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px',
    borderRadius: '4px',
  },
  stepNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600,
    color: '#ffffff',
    flexShrink: 0,
  },
  stepContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  stepDescription: {
    fontSize: '14px',
  },
  stepAction: {
    fontSize: '12px',
    color: '#58a6ff',
    fontFamily: 'monospace',
  },
  stepError: {
    fontSize: '12px',
    color: '#f85149',
  },
  stepStatus: {
    fontSize: '16px',
    width: '20px',
    textAlign: 'center',
  },
  helpSection: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '16px',
    marginTop: 'auto',
  },
  helpTitle: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  helpText: {
    fontSize: '13px',
    color: '#8b949e',
    margin: '0 0 12px 0',
  },
  codeBlock: {
    display: 'block',
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '4px',
    padding: '10px 12px',
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: '13px',
    color: '#f0883e',
  },
};

export default CodeBuddyPanel;
