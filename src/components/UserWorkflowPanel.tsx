/**
 * UserWorkflowPanel.tsx
 * 
 * Panneau de gestion des workflows définis par l'utilisateur dans l'interface Lisa
 * Permet de créer, exécuter, et gérer des workflows personnalisés via des commandes en langage naturel
 */

import React, { useState, useEffect } from 'react';
import { useUserWorkflows } from '../hooks/useUserWorkflows';
import type { WorkflowDefinition } from '../agents/UserWorkflowAgent';

interface UserWorkflowPanelProps {
  handleIntent: (intent: string, isInternal: boolean) => Promise<void>;
}

interface TabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// Composant d'onglets pour la navigation
const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div style={styles.tabs}>
      <button 
        style={{
          ...styles.tabButton,
          ...(activeTab === 'workflows' ? styles.activeTab : {})
        }}
        onClick={() => setActiveTab('workflows')}
      >
        Workflows
      </button>
      <button 
        style={{
          ...styles.tabButton,
          ...(activeTab === 'create' ? styles.activeTab : {})
        }}
        onClick={() => setActiveTab('create')}
      >
        Créer
      </button>
      <button 
        style={{
          ...styles.tabButton,
          ...(activeTab === 'nlCreate' ? styles.activeTab : {})
        }}
        onClick={() => setActiveTab('nlCreate')}
      >
        NL Creator
      </button>
    </div>
  );
};

export const UserWorkflowPanel: React.FC<UserWorkflowPanelProps> = () => {
  // État local
  const [activeTab, setActiveTab] = useState<string>('workflows');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newWorkflowName, setNewWorkflowName] = useState<string>('');
  const [newWorkflowDesc, setNewWorkflowDesc] = useState<string>('');
  const [newWorkflowTrigger, setNewWorkflowTrigger] = useState<string>('');
  const [nlPrompt, setNlPrompt] = useState<string>('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [editStep, setEditStep] = useState<{ index: number; content: string } | null>(null);
  const [newStep, setNewStep] = useState<string>('');
  
  // Obtenir le hook de gestion des workflows utilisateur
  const {
    isLoading,
    error,
    workflows,
    createWorkflow,
    deleteWorkflow,
    executeWorkflow,
    getAllWorkflows,
    parseNaturalLanguage
  } = useUserWorkflows();
  
  // Charger les workflows au démarrage
  useEffect(() => {
    loadWorkflows();
  }, []);
  
  // Fonction pour charger les workflows
  const loadWorkflows = async () => {
    await getAllWorkflows();
  };
  
  // Fonction pour basculer l'affichage détaillé d'un workflow
  const toggleExpand = (workflowId: string) => {
    setExpanded(prev => ({
      ...prev,
      [workflowId]: !prev[workflowId]
    }));
  };
  
  // Fonction pour exécuter un workflow
  const handleExecute = async (workflowId: string) => {
    await executeWorkflow(workflowId);
    await loadWorkflows(); // Recharger après exécution pour refléter les changements d'état
  };
  
  // Fonction pour supprimer un workflow
  const handleDelete = async (workflowId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce workflow ?')) {
      await deleteWorkflow(workflowId);
      await loadWorkflows();
    }
  };
  
  // Fonction pour créer un workflow via l'interface manuelle
  const handleCreateWorkflow = async () => {
    if (!newWorkflowName || !newWorkflowTrigger) {
      alert('Le nom et le déclencheur sont obligatoires');
      return;
    }
    
    const workflowDef: WorkflowDefinition = {
      name: newWorkflowName,
      description: newWorkflowDesc || `Workflow créé le ${new Date().toLocaleDateString()}`,
      trigger: newWorkflowTrigger,
      steps: []
    };
    
    try {
      await createWorkflow(workflowDef);
      
      // Réinitialiser les champs
      setNewWorkflowName('');
      setNewWorkflowDesc('');
      setNewWorkflowTrigger('');
      
      // Revenir à l'onglet des workflows
      setActiveTab('workflows');
      
      // Recharger la liste
      await loadWorkflows();
    } catch (err) {
      console.error('Erreur lors de la création du workflow:', err);
    }
  };
  
  // Fonction pour créer un workflow via langage naturel
  const handleCreateFromNL = async () => {
    if (!nlPrompt) {
      alert('Veuillez entrer une instruction en langage naturel');
      return;
    }
    
    try {
      const workflowDef = await parseNaturalLanguage(nlPrompt);
      
      if (workflowDef) {
        await createWorkflow(workflowDef);
        
        // Réinitialiser les champs
        setNlPrompt('');
        
        // Revenir à l'onglet des workflows
        setActiveTab('workflows');
        
        // Recharger la liste
        await loadWorkflows();
      }
    } catch (err) {
      console.error('Erreur lors de la création du workflow par langage naturel:', err);
    }
  };
  
  // Fonction pour ajouter une étape à un workflow
  const handleAddStep = (workflowId: string) => {
    if (!newStep) return;
    
    setSelectedWorkflow(workflowId);
    // Trouver le workflow et ajouter l'étape
    // Note: Ceci est un exemple, il faudra implémenter la logique d'ajout d'étape
    
    setNewStep('');
  };
  
  // Rendu du contenu selon l'onglet actif
  const renderTabContent = () => {
    switch (activeTab) {
      case 'workflows':
        return (
          <div style={styles.tabContent}>
            <h4 style={styles.subHeader}>Vos Workflows Personnalisés</h4>
            
            {isLoading ? (
              <p style={styles.loadingText}>Chargement des workflows...</p>
            ) : workflows.length > 0 ? (
              <ul style={styles.list}>
                {workflows.map((workflow) => (
                  <li key={workflow.id} style={styles.workflowItem}>
                    <div style={styles.workflowHeader}>
                      <div style={styles.workflowTitle}>
                        {workflow.name}
                      </div>
                      <div style={styles.buttonGroup}>
                        <button 
                          style={styles.actionButton}
                          onClick={() => handleExecute(workflow.id)}
                        >
                          Exécuter
                        </button>
                        <button 
                          style={{...styles.actionButton, backgroundColor: '#dc3545'}}
                          onClick={() => handleDelete(workflow.id)}
                        >
                          Supprimer
                        </button>
                        <button 
                          style={{...styles.actionButton, backgroundColor: '#6c757d'}}
                          onClick={() => toggleExpand(workflow.id)}
                        >
                          {expanded[workflow.id] ? 'Réduire' : 'Détails'}
                        </button>
                      </div>
                    </div>
                    
                    <div style={styles.workflowInfo}>
                      <span style={styles.triggerLabel}>Déclencheur: </span>
                      <span style={styles.trigger}>"{workflow.trigger}"</span>
                    </div>
                    
                    {expanded[workflow.id] && (
                      <div style={styles.details}>
                        <p style={styles.description}>{workflow.description}</p>
                        
                        <h5 style={styles.stepsHeader}>Étapes ({workflow.stepCount})</h5>
                        
                        <div style={styles.addStepContainer}>
                          <input
                            type="text"
                            value={newStep}
                            onChange={(e) => setNewStep(e.target.value)}
                            placeholder="Ajouter une étape..."
                            style={styles.input}
                          />
                          <button
                            style={styles.addButton}
                            onClick={() => handleAddStep(workflow.id)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={styles.emptyText}>
                Aucun workflow personnalisé. Créez-en un nouveau dans l'onglet "Créer".
              </p>
            )}
            
            {error && <p style={styles.errorText}>{error}</p>}
          </div>
        );
        
      case 'create':
        return (
          <div style={styles.tabContent}>
            <h4 style={styles.subHeader}>Créer un Workflow</h4>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Nom du workflow:
                <input
                  type="text"
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  placeholder="Mon Workflow"
                  style={styles.input}
                />
              </label>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Description:
                <textarea
                  value={newWorkflowDesc}
                  onChange={(e) => setNewWorkflowDesc(e.target.value)}
                  placeholder="Description du workflow..."
                  style={styles.textarea}
                />
              </label>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Phrase de déclenchement:
                <input
                  type="text"
                  value={newWorkflowTrigger}
                  onChange={(e) => setNewWorkflowTrigger(e.target.value)}
                  placeholder="Ex: quand je dis bonjour"
                  style={styles.input}
                />
              </label>
            </div>
            
            <button
              style={styles.createButton}
              onClick={handleCreateWorkflow}
              disabled={isLoading}
            >
              {isLoading ? 'Création...' : 'Créer le Workflow'}
            </button>
          </div>
        );
        
      case 'nlCreate':
        return (
          <div style={styles.tabContent}>
            <h4 style={styles.subHeader}>Création en Langage Naturel</h4>
            <p style={styles.nlInfo}>
              Décrivez votre workflow en langage naturel et Lisa le créera pour vous.
            </p>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Description du workflow:
                <textarea
                  value={nlPrompt}
                  onChange={(e) => setNlPrompt(e.target.value)}
                  placeholder="Ex: Crée un workflow qui envoie un message quand je dis bonjour et qui répond avec la météo du jour"
                  style={{...styles.textarea, minHeight: '150px'}}
                />
              </label>
            </div>
            
            <button
              style={styles.createButton}
              onClick={handleCreateFromNL}
              disabled={isLoading}
            >
              {isLoading ? 'Création...' : 'Générer le Workflow'}
            </button>
            
            <p style={styles.nlTips}>
              <strong>Astuces:</strong> Incluez des informations sur le déclencheur, les étapes du workflow et le résultat attendu.
            </p>
          </div>
        );
        
      default:
        return <div>Contenu non disponible</div>;
    }
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Workflows Personnalisés</h3>
      </div>
      
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {renderTabContent()}
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderRadius: '10px',
    padding: '15px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    marginBottom: '15px',
  },
  title: {
    margin: '0 0 10px 0',
    color: '#f0f0f0',
    fontSize: '1.2em',
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
    overflowY: 'auto',
    flexGrow: 1,
  },
  subHeader: {
    marginTop: 0,
    marginBottom: '15px',
    color: '#aaa',
    fontSize: '0.9em',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  workflowItem: {
    padding: '12px',
    marginBottom: '12px',
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
    color: '#e0e0e0',
  },
  workflowInfo: {
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
  },
  triggerLabel: {
    color: '#888',
    fontSize: '0.85em',
    marginRight: '5px',
  },
  trigger: {
    color: '#ffc107',
    fontSize: '0.9em',
    fontStyle: 'italic',
  },
  buttonGroup: {
    display: 'flex',
    gap: '5px',
  },
  actionButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8em',
  },
  details: {
    padding: '10px',
    backgroundColor: 'rgba(40, 40, 40, 0.5)',
    borderRadius: '5px',
    marginTop: '10px',
  },
  description: {
    color: '#ccc',
    fontSize: '0.9em',
    marginBottom: '15px',
  },
  stepsHeader: {
    color: '#aaa',
    fontSize: '0.85em',
    marginBottom: '8px',
    fontWeight: 'normal',
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
    marginTop: '5px',
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
    marginTop: '5px',
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
  addStepContainer: {
    display: 'flex',
    gap: '5px',
  },
  addButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1.1em',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: '0.9em',
    fontStyle: 'italic',
  },
  errorText: {
    color: '#dc3545',
    fontSize: '0.85em',
    marginTop: '10px',
  },
  emptyText: {
    color: '#888',
    fontSize: '0.9em',
    fontStyle: 'italic',
  },
  nlInfo: {
    color: '#aaa',
    fontSize: '0.85em',
    marginBottom: '15px',
  },
  nlTips: {
    color: '#888',
    fontSize: '0.8em',
    marginTop: '15px',
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid rgba(0, 123, 255, 0.2)',
  },
};
