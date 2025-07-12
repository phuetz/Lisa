import React, { useState } from 'react';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { useWorkflowEngine } from '../hooks/useWorkflowEngine';
import type { Workflow } from '../utils/WorkflowEngine';

interface WorkflowManagerPanelProps {
  handleIntent: (intent: string, isInternal: boolean) => Promise<void>;
}

interface TabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div style={styles.tabs}>
      <button 
        style={{
          ...styles.tabButton,
          ...(activeTab === 'active' ? styles.activeTab : {})
        }}
        onClick={() => setActiveTab('active')}
      >
        Active
      </button>
      <button 
        style={{
          ...styles.tabButton,
          ...(activeTab === 'templates' ? styles.activeTab : {})
        }}
        onClick={() => setActiveTab('templates')}
      >
        Templates
      </button>
      <button 
        style={{
          ...styles.tabButton,
          ...(activeTab === 'history' ? styles.activeTab : {})
        }}
        onClick={() => setActiveTab('history')}
      >
        History
      </button>
      <button 
        style={{
          ...styles.tabButton,
          ...(activeTab === 'create' ? styles.activeTab : {})
        }}
        onClick={() => setActiveTab('create')}
      >
        Create
      </button>
    </div>
  );
};

export const WorkflowManagerPanel: React.FC<WorkflowManagerPanelProps> = ({ handleIntent }) => {
  // State hooks
  const [activeTab, setActiveTab] = useState<string>('active');
  const [newWorkflowName, setNewWorkflowName] = useState<string>('');
  const [newWorkflowDesc, setNewWorkflowDesc] = useState<string>('');
  const [nlPrompt, setNlPrompt] = useState<string>('');
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  
  // Get data from workflow engine
  const {
    activeWorkflows,
    templates,
    history,
    isLoading,
    createWorkflow,
    executeWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,
    saveAsTemplate,
    createWorkflowFromNL
  } = useWorkflowEngine();
  
  // Get legacy data from store (for backward compatibility)
  const { legacyTemplates, checkpoints } = useVisionAudioStore(state => ({
    legacyTemplates: state.templates || [],
    checkpoints: state.checkpoints || [],
  }));
  
  const handleLoadTemplate = (templateName: string) => {
    handleIntent(`load template ${templateName}`, true);
  };

  const handleResumeCheckpoint = (checkpointId: string) => {
    handleIntent(`resume checkpoint ${checkpointId}`, true);
  };
  
  // Create a new workflow from natural language
  const handleCreateFromNL = async () => {
    if (!nlPrompt) return;
    
    try {
      await createWorkflowFromNL(
        nlPrompt,
        newWorkflowName || `Workflow ${new Date().toLocaleTimeString()}`,
        newWorkflowDesc || 'Created from natural language'
      );
      
      setNlPrompt('');
      setNewWorkflowName('');
      setNewWorkflowDesc('');
      setActiveTab('active');
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };
  
  // Execute workflow
  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      await executeWorkflow(workflowId);
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };
  
  // Toggle showing details for a workflow
  const toggleDetails = (id: string) => {
    setShowDetails(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Render appropriate content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'active':
        return (
          <div style={styles.tabContent}>
            <h4 style={styles.subHeader}>Active Workflows</h4>
            {activeWorkflows.length > 0 ? (
              <ul style={styles.list}>
                {activeWorkflows.map(workflow => (
                  <li key={workflow.id} style={styles.workflowItem}>
                    <div style={styles.workflowHeader}>
                      <span style={styles.workflowTitle}>{workflow.name}</span>
                      <div style={styles.buttonGroup}>
                        {workflow.status === 'pending' && (
                          <button 
                            onClick={() => handleExecuteWorkflow(workflow.id)}
                            style={styles.button}
                            disabled={isLoading[workflow.id]}
                          >
                            {isLoading[workflow.id] ? 'Starting...' : 'Start'}
                          </button>
                        )}
                        {workflow.status === 'in_progress' && (
                          <button 
                            onClick={() => pauseWorkflow(workflow.id)}
                            style={styles.button}
                          >
                            Pause
                          </button>
                        )}
                        {workflow.status === 'paused' && (
                          <button 
                            onClick={() => resumeWorkflow(workflow.id)}
                            style={styles.button}
                          >
                            Resume
                          </button>
                        )}
                        <button 
                          onClick={() => cancelWorkflow(workflow.id)}
                          style={{...styles.button, backgroundColor: '#dc3545'}}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => toggleDetails(workflow.id)}
                          style={{...styles.button, backgroundColor: '#6c757d'}}
                        >
                          {showDetails[workflow.id] ? 'Hide' : 'Details'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div style={styles.progressContainer}>
                      <div 
                        style={{
                          ...styles.progressBar,
                          width: `${workflow.progress}%`
                        }}
                      />
                      <span style={styles.progressText}>{workflow.progress}%</span>
                    </div>
                    
                    {/* Details section */}
                    {showDetails[workflow.id] && (
                      <div style={styles.details}>
                        <p style={styles.detailText}>
                          <strong>Status:</strong> {workflow.status}
                        </p>
                        <p style={styles.detailText}>
                          <strong>Steps:</strong> {workflow.steps.length}
                        </p>
                        <div style={styles.stepsList}>
                          {workflow.steps.map(step => (
                            <div 
                              key={step.id} 
                              style={{
                                ...styles.step,
                                ...getStepStatusStyle(step.status)
                              }}
                            >
                              <span style={styles.stepText}>
                                {step.description}
                              </span>
                              <span style={styles.stepStatus}>
                                {step.status}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div style={styles.buttonGroup}>
                          <button
                            onClick={() => {
                              saveAsTemplate(
                                workflow.id,
                                `${workflow.name} Template`,
                                workflow.description,
                                ['auto-saved']
                              );
                            }}
                            style={styles.button}
                          >
                            Save as Template
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={styles.emptyText}>No active workflows.</p>
            )}
          </div>
        );
        
      case 'templates':
        return (
          <div style={styles.tabContent}>
            <h4 style={styles.subHeader}>Workflow Templates</h4>
            
            {/* Advanced templates */}
            {templates.length > 0 ? (
              <ul style={styles.list}>
                {templates.map(template => (
                  <li key={template.id} style={styles.workflowItem}>
                    <div style={styles.workflowHeader}>
                      <span style={styles.workflowTitle}>{template.name}</span>
                      <div style={styles.buttonGroup}>
                        <button 
                          onClick={() => {
                            createWorkflow({
                              name: template.name,
                              description: template.description,
                              templateId: template.id
                            });
                            setActiveTab('active');
                          }}
                          style={styles.button}
                        >
                          Load
                        </button>
                        <button 
                          onClick={() => toggleDetails(template.id)}
                          style={{...styles.button, backgroundColor: '#6c757d'}}
                        >
                          {showDetails[template.id] ? 'Hide' : 'Details'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Template details */}
                    {showDetails[template.id] && (
                      <div style={styles.details}>
                        <p style={styles.detailText}>
                          <strong>Description:</strong> {template.description}
                        </p>
                        <p style={styles.detailText}>
                          <strong>Steps:</strong> {template.steps.length}
                        </p>
                        <div style={styles.tagsList}>
                          {template.tags.map(tag => (
                            <span key={tag} style={styles.tag}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
            
            {/* Legacy templates */}
            {legacyTemplates.length > 0 ? (
              <div>
                <h5 style={styles.subSubHeader}>Legacy Templates</h5>
                <ul style={styles.list}>
                  {legacyTemplates.map(template => (
                    <li key={template} style={styles.listItem}>
                      <span>{template}</span>
                      <button onClick={() => handleLoadTemplate(template)} style={styles.button}>Load</button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            
            {templates.length === 0 && legacyTemplates.length === 0 && (
              <p style={styles.emptyText}>No saved templates.</p>
            )}
            
            {/* Legacy checkpoints */}
            <h4 style={styles.subHeader}>Checkpoints</h4>
            {checkpoints.length > 0 ? (
              <ul style={styles.list}>
                {checkpoints.map(checkpoint => (
                  <li key={checkpoint} style={styles.listItem}>
                    <span style={styles.checkpointId}>{checkpoint}</span>
                    <button onClick={() => handleResumeCheckpoint(checkpoint)} style={styles.button}>Resume</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={styles.emptyText}>No available checkpoints.</p>
            )}
          </div>
        );
        
      case 'history':
        return (
          <div style={styles.tabContent}>
            <h4 style={styles.subHeader}>Workflow History</h4>
            {history.length > 0 ? (
              <ul style={styles.list}>
                {history.map(item => (
                  <li key={item.id} style={styles.workflowItem}>
                    <div style={styles.workflowHeader}>
                      <span style={styles.workflowTitle}>
                        {item.workflow.name}
                      </span>
                      <span style={{
                        ...styles.outcome,
                        color: item.outcome === 'completed' ? '#28a745' : 
                              item.outcome === 'failed' ? '#dc3545' : '#ffc107'
                      }}>
                        {item.outcome}
                      </span>
                    </div>
                    <p style={styles.timestamp}>
                      {new Date(item.startTime).toLocaleString()}
                      {item.duration && ` (${(item.duration / 1000).toFixed(1)}s)`}
                    </p>
                    <p style={styles.summary}>{item.summary}</p>
                    <button 
                      onClick={() => toggleDetails(item.id)}
                      style={{...styles.button, backgroundColor: '#6c757d'}}
                    >
                      {showDetails[item.id] ? 'Hide' : 'Details'}
                    </button>
                    
                    {showDetails[item.id] && (
                      <div style={styles.details}>
                        <p style={styles.detailText}>
                          <strong>Steps:</strong> {item.workflow.steps.length}
                        </p>
                        <div style={styles.stepsList}>
                          {item.workflow.steps.map(step => (
                            <div 
                              key={step.id} 
                              style={{
                                ...styles.step,
                                ...getStepStatusStyle(step.status)
                              }}
                            >
                              <span style={styles.stepText}>
                                {step.description}
                              </span>
                              <span style={styles.stepStatus}>
                                {step.status}
                                {step.duration && ` (${(step.duration / 1000).toFixed(1)}s)`}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div style={styles.buttonGroup}>
                          <button
                            onClick={() => {
                              createWorkflow({
                                name: `${item.workflow.name} (Copy)`,
                                description: item.workflow.description,
                                steps: item.workflow.steps.map(({ id, description, agent, command, args, dependencies }) => ({
                                  id, description, agent, command, args, dependencies
                                }))
                              });
                              setActiveTab('active');
                            }}
                            style={styles.button}
                          >
                            Clone Workflow
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={styles.emptyText}>No workflow history.</p>
            )}
          </div>
        );
        
      case 'create':
        return (
          <div style={styles.tabContent}>
            <h4 style={styles.subHeader}>Create New Workflow</h4>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Natural Language Request:</label>
              <textarea
                value={nlPrompt}
                onChange={(e) => setNlPrompt(e.target.value)}
                style={styles.textarea}
                placeholder="Ask Lisa to create a workflow... e.g., 'Find Italian restaurants, book a table for two, and add to calendar'"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Workflow Name:</label>
              <input
                type="text"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                style={styles.input}
                placeholder="My Workflow"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Description:</label>
              <input
                type="text"
                value={newWorkflowDesc}
                onChange={(e) => setNewWorkflowDesc(e.target.value)}
                style={styles.input}
                placeholder="Description of what this workflow does"
              />
            </div>
            
            <button 
              onClick={handleCreateFromNL}
              style={styles.createButton}
              disabled={!nlPrompt}
            >
              {isLoading[nlPrompt] ? 'Creating...' : 'Create Workflow'}
            </button>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // Helper function to get style based on step status
  const getStepStatusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'completed':
        return { borderLeft: '3px solid #28a745' };
      case 'failed':
        return { borderLeft: '3px solid #dc3545' };
      case 'in_progress':
        return { borderLeft: '3px solid #007bff' };
      case 'waiting':
        return { borderLeft: '3px solid #ffc107' };
      default:
        return { borderLeft: '3px solid #6c757d' };
    }
  };

  return (
    <div style={styles.panel}>
      <h3 style={styles.header}>Workflow Manager</h3>
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      {renderTabContent()}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  panel: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '400px',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: '8px',
    padding: '15px',
    color: '#fff',
    fontFamily: 'sans-serif',
    border: '1px solid #444',
    zIndex: 1000,
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    marginTop: 0,
    marginBottom: '15px',
    borderBottom: '1px solid #444',
    paddingBottom: '10px',
  },
  section: {
    marginBottom: '15px',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #444',
    marginBottom: '15px',
  },
  tabButton: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#aaa',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '0.9em',
    transition: 'all 0.2s',
  },
  activeTab: {
    color: '#fff',
    borderBottom: '2px solid #007bff',
  },
  tabContent: {
    padding: '5px 0',
  },
  subHeader: {
    marginTop: 0,
    marginBottom: '10px',
    color: '#aaa',
    fontSize: '0.9em',
  },
  subSubHeader: {
    marginTop: '15px',
    marginBottom: '5px',
    color: '#888',
    fontSize: '0.85em',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #333',
  },
  workflowItem: {
    padding: '10px',
    marginBottom: '10px',
    backgroundColor: 'rgba(50, 50, 50, 0.5)',
    borderRadius: '5px',
    border: '1px solid #444',
  },
  workflowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  workflowTitle: {
    fontWeight: 'bold',
    fontSize: '1em',
  },
  buttonGroup: {
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  progressContainer: {
    height: '6px',
    backgroundColor: '#333',
    borderRadius: '3px',
    marginBottom: '10px',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: '3px',
    transition: 'width 0.3s',
  },
  progressText: {
    position: 'absolute',
    right: '0',
    top: '-15px',
    fontSize: '0.7em',
    color: '#aaa',
  },
  details: {
    padding: '10px',
    backgroundColor: 'rgba(40, 40, 40, 0.5)',
    borderRadius: '5px',
    marginTop: '10px',
  },
  detailText: {
    margin: '5px 0',
    fontSize: '0.85em',
  },
  stepsList: {
    marginTop: '10px',
    maxHeight: '150px',
    overflowY: 'auto',
  },
  step: {
    padding: '5px 8px',
    marginBottom: '5px',
    backgroundColor: 'rgba(60, 60, 60, 0.5)',
    borderRadius: '3px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepText: {
    fontSize: '0.8em',
    flexGrow: 1,
  },
  stepStatus: {
    fontSize: '0.7em',
    padding: '2px 5px',
    borderRadius: '3px',
    backgroundColor: '#444',
    marginLeft: '5px',
  },
  tagsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
    marginTop: '8px',
  },
  tag: {
    fontSize: '0.7em',
    padding: '2px 6px',
    backgroundColor: '#333',
    borderRadius: '10px',
    color: '#ddd',
  },
  timestamp: {
    fontSize: '0.75em',
    color: '#888',
    marginBottom: '5px',
  },
  summary: {
    fontSize: '0.85em',
    marginBottom: '10px',
  },
  outcome: {
    fontSize: '0.75em',
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    color: '#aaa',
    fontSize: '0.85em',
  },
  input: {
    width: '100%',
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #555',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '0.9em',
  },
  textarea: {
    width: '100%',
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #555',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '0.9em',
    minHeight: '100px',
    resize: 'vertical',
  },
  createButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
    fontSize: '1em',
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8em',
  },
  emptyText: {
    color: '#888',
    fontSize: '0.9em',
  },
  checkpointId: {
    fontSize: '0.8em',
    fontFamily: 'monospace',
    color: '#ccc',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '150px',
  }
};
