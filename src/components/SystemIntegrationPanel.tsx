/**
 * SystemIntegrationPanel.tsx
 * 
 * Panneau d'interface utilisateur pour gérer les intégrations système
 * Permet de créer, configurer, tester et exécuter des intégrations avec des systèmes externes
 */

import React, { useState, useEffect } from 'react';
import { useSystemIntegration } from '../hooks/useSystemIntegration';
import { SYSTEM_INTEGRATION_TYPES, type SystemIntegrationConfig, type SystemIntegrationType } from '../agents/SystemIntegrationAgent';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';

// Styles pour l'ensemble du panneau
const styles = {
  container: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '16px',
    height: '100%',
    maxHeight: '100%',
    overflow: 'hidden',
    backgroundColor: '#f8f9fa'
  },
  header: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '8px 0',
    borderBottom: '1px solid #e1e4e8'
  },
  title: {
    fontSize: '1.5em',
    fontWeight: 'bold',
    margin: '0'
  },
  tabs: {
    display: 'flex' as const,
    gap: '8px',
    marginBottom: '16px',
    borderBottom: '1px solid #e1e4e8'
  },
  tabButton: {
    padding: '8px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    fontWeight: 'normal',
    color: '#555',
    fontSize: '1rem'
  },
  activeTab: {
    borderBottom: '2px solid #3182ce',
    fontWeight: 'bold',
    color: '#3182ce'
  },
  contentArea: {
    flexGrow: 1,
    overflowY: 'auto' as const,
    padding: '8px'
  },
  card: {
    border: '1px solid #e1e4e8',
    borderRadius: '8px',
    backgroundColor: '#fff',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    marginBottom: '16px'
  },
  selectedCard: {
    border: '2px solid #3182ce',
    boxShadow: '0 0 0 1px #3182ce'
  },
  cardHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid #e1e4e8',
    backgroundColor: '#f8f9fa'
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    margin: '0'
  },
  cardDescription: {
    fontSize: '0.9rem',
    color: '#666',
    margin: '4px 0 0 0'
  },
  cardContent: {
    padding: '16px'
  },
  cardFooter: {
    padding: '12px 16px',
    borderTop: '1px solid #e1e4e8',
    backgroundColor: '#f8f9fa',
    display: 'flex' as const,
    justifyContent: 'space-between' as const
  },
  grid: {
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px'
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block' as const,
    marginBottom: '6px',
    fontWeight: 'bold',
    fontSize: '0.9rem'
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1rem'
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1rem',
    backgroundColor: '#fff'
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1rem',
    fontFamily: 'monospace',
    minHeight: '100px'
  },
  button: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    backgroundColor: '#3182ce',
    color: '#fff',
    fontSize: '0.9rem'
  },
  outlineButton: {
    padding: '8px 16px',
    border: '1px solid #3182ce',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    backgroundColor: 'transparent',
    color: '#3182ce',
    fontSize: '0.9rem'
  },
  dangerButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    backgroundColor: '#e53e3e',
    color: '#fff',
    fontSize: '0.9rem'
  },
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  badge: {
    display: 'inline-block' as const,
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.8em',
    fontWeight: 'bold',
    backgroundColor: '#333',
    color: '#fff',
    marginRight: '5px'
  },
  badgeOutline: {
    backgroundColor: 'transparent',
    border: '1px solid #ccc',
    color: '#333'
  },
  flexRow: {
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: '8px'
  },
  flexColumn: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '8px'
  },
  flexWrap: {
    display: 'flex' as const,
    flexWrap: 'wrap' as const,
    gap: '4px'
  },
  loadingSpinner: {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '2px solid rgba(0,0,0,0.1)',
    borderRadius: '50%',
    borderTopColor: '#3182ce',
    animation: 'spin 1s ease-in-out infinite'
  },
  separator: {
    height: '1px',
    backgroundColor: '#e1e4e8',
    margin: '16px 0',
    border: 'none'
  },
  tagInput: {
    display: 'flex' as const,
    flexWrap: 'wrap' as const,
    gap: '8px',
    alignItems: 'center' as const
  },
  tag: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    backgroundColor: '#e1e4e8',
    color: '#333',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.8em'
  },
  removeTagButton: {
    marginLeft: '4px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#666',
    cursor: 'pointer',
    fontSize: '0.8em'
  },
  switchContainer: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '8px'
  },
  switch: {
    position: 'relative' as const,
    display: 'inline-block' as const,
    width: '40px',
    height: '20px'
  },
  switchInput: {
    opacity: 0,
    width: 0,
    height: 0
  },
  switchSlider: {
    position: 'absolute' as const,
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ccc',
    borderRadius: '20px',
    transition: '0.4s'
  },
  switchSliderChecked: {
    backgroundColor: '#3182ce'
  },
  switchSliderBefore: {
    position: 'absolute' as const,
    content: '""',
    height: '16px',
    width: '16px',
    left: '2px',
    bottom: '2px',
    backgroundColor: '#fff',
    borderRadius: '50%',
    transition: '0.4s'
  },
  switchSliderBeforeChecked: {
    transform: 'translateX(20px)'
  }
};

// Fonction pour obtenir le style de badge pour un type d'intégration
const getIntegrationTypeStyle = (type: SystemIntegrationType): React.CSSProperties => {
  const baseStyle = { ...styles.badge };
  
  switch (type) {
    case 'api': return { ...baseStyle, backgroundColor: '#4CAF50' };
    case 'webhook': return { ...baseStyle, backgroundColor: '#2196F3' };
    case 'mqtt': return { ...baseStyle, backgroundColor: '#9C27B0' };
    case 'socket': return { ...baseStyle, backgroundColor: '#FF5722' };
    case 'http': return { ...baseStyle, backgroundColor: '#3F51B5' };
    case 'database': return { ...baseStyle, backgroundColor: '#607D8B' };
    case 'file': return { ...baseStyle, backgroundColor: '#795548' };
    case 'shell': return { ...baseStyle, backgroundColor: '#E91E63' };
    default: return baseStyle;
  }
};

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
          ...(activeTab === 'list' ? styles.activeTab : {})
        }}
        onClick={() => setActiveTab('list')}
      >
        Liste
      </button>
      <button 
        style={{
          ...styles.tabButton,
          ...(activeTab === 'execute' ? styles.activeTab : {})
        }}
        onClick={() => setActiveTab('execute')}
      >
        Exécuter
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
          ...(activeTab === 'test' ? styles.activeTab : {})
        }}
        onClick={() => setActiveTab('test')}
      >
        Test
      </button>
    </div>
  );
};

/**
 * Composant principal du panneau d'intégration système
 */
export const SystemIntegrationPanel: React.FC = () => {
  const { t } = useTranslation();
  const { 
    integrations, 
    isLoading, 
    loadIntegrations, 
    executeIntegration, 
    testIntegration,
    deleteIntegration
  } = useSystemIntegration();
  
  const [activeTab, setActiveTab] = useState<string>('list');
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [executionParams, setExecutionParams] = useState<string>('{}');
  const [executionResult, setExecutionResult] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [expandedIntegrations, setExpandedIntegrations] = useState<Record<string, boolean>>({});
  
  // Toast notification function (simplified version)
  const toast = {
    success: (message: string) => { console.log('SUCCESS:', message); },
    error: (message: string) => { console.error('ERROR:', message); },
    info: (message: string) => { console.info('INFO:', message); }
  };

  // États pour la création/édition d'intégration
  const [newIntegration, setNewIntegration] = useState<{
    name: string;
    description: string;
    type: SystemIntegrationType;
    config: string;
    enabled: boolean;
    tags: string[];
    icon?: string;
  }>({ 
    name: '', 
    description: '', 
    type: 'api', 
    config: '{}', 
    enabled: true, 
    tags: [],
    icon: undefined
  });
  const [newTag, setNewTag] = useState<string>('');
  
  // Charger les intégrations au montage du composant
  useEffect(() => {
    // Note: Nous utilisons directement les données d'intégrations fournies par le hook
    // Pas besoin d'appeler une fonction explicite pour charger les données
    console.log('Intégrations disponibles:', integrations.length);
  }, [integrations.length]);

  // Exécuter une intégration
  const handleExecuteIntegration = async () => {
    if (!selectedIntegration) {
      alert('Veuillez sélectionner une intégration à exécuter.');
      return;
    }

    try {
      let params: Record<string, any> = {};
      try {
        params = JSON.parse(executionParams);
      } catch (error) {
        alert('Paramètres JSON invalides. Veuillez vérifier le format.');
        return;
      }

      const result = await executeIntegration(selectedIntegration, params);
      setExecutionResult(JSON.stringify(result.data, null, 2));
      
      if (result.success) {
        alert('Intégration exécutée avec succès !');
      }
    } catch (error) {
      alert(`Erreur lors de l'exécution : ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Tester une intégration
  const handleTestIntegration = async () => {
    if (!selectedIntegration) {
      alert('Veuillez sélectionner une intégration à tester.');
      return;
    }

    try {
      const result = await testIntegration(selectedIntegration);
      setExecutionResult(JSON.stringify(result.data, null, 2));
      
      if (result.success) {
        alert('Test réussi !');
      }
    } catch (error) {
      alert(`Erreur lors du test : ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Supprimer une intégration
  const handleDeleteIntegration = async () => {
    if (!selectedIntegration) {
      alert('Veuillez sélectionner une intégration à supprimer.');
      return;
    }
    
    const integration = getSelectedIntegration();
    if (!integration) return;
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'intégration "${integration.name}" ?`)) {
      try {
        const result = await deleteIntegration(selectedIntegration);
        
        if (result.success) {
          setSelectedIntegration(null);
          alert(`Intégration "${integration.name}" supprimée avec succès.`);
        }
      } catch (error) {
        alert(`Erreur lors de la suppression : ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  // Obtenir le style de badge pour un type d'intégration
  const getIntegrationTypeStyle = (type: SystemIntegrationType): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '0.8em',
      fontWeight: 'bold',
      backgroundColor: '#333',
      color: '#fff',
      marginRight: '5px'
    };
    
    switch (type) {
      case 'api': return { ...baseStyle, backgroundColor: '#4CAF50' };
      case 'webhook': return { ...baseStyle, backgroundColor: '#2196F3' };
      case 'mqtt': return { ...baseStyle, backgroundColor: '#9C27B0' };
      case 'socket': return { ...baseStyle, backgroundColor: '#FF5722' };
      case 'http': return { ...baseStyle, backgroundColor: '#3F51B5' };
      case 'database': return { ...baseStyle, backgroundColor: '#607D8B' };
      case 'file': return { ...baseStyle, backgroundColor: '#795548' };
      case 'shell': return { ...baseStyle, backgroundColor: '#E91E63' };
      default: return baseStyle;
    }
  };
  
  // Basculer l'expansion du panneau
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{t('Intégrations système')}</h2>
      </div>
      
      <div style={styles.tabs}>
        <button 
          style={{
            ...styles.tabButton,
            ...(activeTab === 'list' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('list')}
        >
          Liste
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
            ...(activeTab === 'execute' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('execute')}
        >
          Exécuter
        </button>
        <button 
          style={{
            ...styles.tabButton,
            ...(activeTab === 'test' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('test')}
        >
          Test
        </button>
      </div>
      
      {/* Contenu des onglets */}
      {activeTab === 'list' && (
        <div style={styles.contentArea}>
          <div style={styles.grid}>
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', width: '100%' }}>
                <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                  {/* Spinner icon placeholder */}
                  <span>Chargement...</span>
                </div>
              </div>
            ) : integrations.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', width: '100%' }}>
                <p style={{ fontSize: '1.125rem', color: '#666', marginBottom: '1rem' }}>Aucune intégration système configurée</p>
                <button 
                  style={styles.button}
                  onClick={() => setActiveTab('create')}
                >
                  Créer une nouvelle intégration
                </button>
              </div>
            ) : (
              integrations.map(integration => (
                <div 
                  key={integration.id} 
                  style={{
                    ...styles.card,
                    ...(selectedIntegration === integration.id ? styles.selectedCard : {}),
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedIntegration(integration.id)}
                >
                  <div style={styles.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        ...getIntegrationTypeStyle(integration.type),
                        marginBottom: '8px'
                      }}>
                        {/* Integration type icon would go here */}
                        <span style={{ marginLeft: '4px' }}>{integration.type}</span>
                      </span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {integration.enabled ? (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#10B981',
                            color: '#fff',
                            fontSize: '0.8em',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {/* CheckCircle icon would go here */}
                            <span style={{ marginLeft: '4px' }}>Activé</span>
                          </span>
                        ) : (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: '1px solid #ccc',
                            color: '#666',
                            fontSize: '0.8em',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {/* AlertCircle icon would go here */}
                            <span style={{ marginLeft: '4px' }}>Désactivé</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 style={styles.cardTitle}>{integration.name}</h3>
                    {integration.metadata?.description && (
                      <p style={styles.cardDescription}>{integration.metadata.description}</p>
                    )}
                  </div>
                  
                  <div style={{
                    ...styles.cardContent,
                    paddingBottom: '8px'
                  }}>
                    {integration.metadata?.tags && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                        {integration.metadata.tags.map((tag, i) => (
                          <span 
                            key={i} 
                            style={{
                              padding: '2px 6px',
                              fontSize: '0.75rem',
                              borderRadius: '12px',
                              border: '1px solid #ccc',
                              color: '#666'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      <p>ID: {integration.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  
                  <div style={styles.cardFooter}>
                    <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'space-between' }}>
                      <button 
                        style={styles.outlineButton}
                        onClick={() => {
                          setSelectedIntegration(integration.id);
                          setActiveTab('execute');
                        }}
                      >
                        Exécuter
                      </button>
                      <button 
                        style={styles.dangerButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIntegration(integration.id);
                          handleDeleteIntegration();
                        }}
                      >
                        {/* Delete icon would go here */}
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Création d'une nouvelle intégration */}
        {activeTab === 'create' && (
          <div style={styles.contentArea}>
            <IntegrationCreateForm onSuccess={() => {
              loadIntegrations();
              setActiveTab('list');
            }} />
          </div>
        )}
        
        {/* Exécution d'une intégration */}
        {activeTab === 'execute' && (
          <div style={styles.contentArea}>
          <div className="mb-4">
            <label style={styles.label}>Sélectionner une intégration</label>
            <select 
              style={styles.select}
              value={selectedIntegration || ''} 
              onChange={(e) => setSelectedIntegration(e.target.value)}
            >
              <option value="">Sélectionnez une intégration...</option>
              {integrations.map(integration => (
                <option key={integration.id} value={integration.id}>
                  {integration.name} ({integration.type})
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label style={styles.label}>Paramètres d'exécution (JSON)</label>
            <textarea
              style={{...styles.textarea, fontFamily: 'monospace'}}
              value={executionParams}
              onChange={(e) => setExecutionParams(e.target.value)}
              rows={5}
            />
          </div>
          
          <div className="flex gap-2 mb-4">
            <button 
              style={{
                ...styles.button,
                ...(!selectedIntegration || isLoading ? styles.disabledButton : {})
              }}
              onClick={handleExecuteIntegration} 
              disabled={!selectedIntegration || isLoading}
            >
              Exécuter
            </button>
            <button 
              style={{
                ...styles.outlineButton,
                ...(!selectedIntegration || isLoading ? styles.disabledButton : {})
              }}
              onClick={handleTestIntegration} 
              disabled={!selectedIntegration || isLoading}
            >
              Tester la connexion
            </button>
          </div>
          
          <div>
            <label style={styles.label}>Résultat</label>
            <textarea
              style={{...styles.textarea, fontFamily: 'monospace', height: '160px'}}
              value={executionResult}
              readOnly
              rows={8}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Formulaire pour créer une nouvelle intégration
 */
interface IntegrationCreateFormProps {
  onSuccess: () => void;
}

const IntegrationCreateForm: React.FC<IntegrationCreateFormProps> = ({ onSuccess }) => {
  const { registerIntegration } = useSystemIntegration();
  const [isLoading, setIsLoading] = useState(false);
  
  const [newIntegration, setNewIntegration] = useState<Partial<SystemIntegrationConfig>>({
    id: uuidv4(),
    name: '',
    type: 'api',
    enabled: true,
    configuration: {},
    metadata: {
      description: '',
      tags: []
    }
  });
  
  // Mettre à jour la valeur d'un champ de l'intégration
  const updateIntegrationField = (
    field: keyof SystemIntegrationConfig, 
    value: any
  ) => {
    setNewIntegration(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Mettre à jour la configuration
  const updateConfiguration = (key: string, value: any) => {
    setNewIntegration(prev => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        [key]: value
      }
    }));
  };

  // Mettre à jour les métadonnées
  const updateMetadata = (key: string, value: any) => {
    setNewIntegration(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: value
      }
    }));
  };
  
  // Gérer la création d'une nouvelle intégration
  const handleCreateIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newIntegration.name || !newIntegration.type) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const result = await registerIntegration(newIntegration as SystemIntegrationConfig);
      
      if (result.success) {
        alert(`Intégration "${newIntegration.name}" créée avec succès.`);
        onSuccess();
      }
    } catch (error) {
      alert(`Erreur lors de la création : ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Obtenir les champs de configuration selon le type
  const getConfigurationFields = () => {
    switch (newIntegration.type) {
      case 'api':
        return (
          <>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <div style={{marginBottom: '8px'}}>
                <label style={styles.label} htmlFor="baseUrl">URL de base de l'API</label>
                <input
                  style={styles.input}
                  id="baseUrl"
                  placeholder="https://api.example.com/v1"
                  value={(newIntegration.configuration as any)?.baseUrl || ''}
                  onChange={(e) => updateConfiguration('baseUrl', e.target.value)}
                />
              </div>
              <div style={{marginBottom: '8px'}}>
                <label style={styles.label} htmlFor="authType">Type d'authentification</label>
                <select 
                  style={styles.select}
                  id="authType"
                  value={(newIntegration.configuration as any)?.authType || 'none'}
                  onChange={(e) => updateConfiguration('authType', e.target.value)}
                >
                  <option value="none">Aucune</option>
                  <option value="basic">Basic Auth</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="apiKey">API Key</option>
                </select>
              </div>
              {(newIntegration.configuration as any)?.authType === 'apiKey' && (
                <>
                  <div style={{marginBottom: '8px'}}>
                    <label style={styles.label} htmlFor="apiKeyName">Nom de la clé API</label>
                    <input
                      style={styles.input}
                      id="apiKeyName"
                      placeholder="X-API-KEY"
                      value={(newIntegration.configuration as any)?.apiKeyName || ''}
                      onChange={(e) => updateConfiguration('apiKeyName', e.target.value)}
                    />
                  </div>
                  <div style={{marginBottom: '8px'}}>
                    <label style={styles.label} htmlFor="apiKeyValue">Valeur de la clé API</label>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <input
                        style={styles.input}
                        id="apiKeyValue"
                        type="password"
                        placeholder="votre-clé-api"
                        value={(newIntegration.configuration as any)?.apiKeyValue || ''}
                        onChange={(e) => updateConfiguration('apiKeyValue', e.target.value)}
                      />
                      {/* Lock icon would go here */}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        );
      
      case 'webhook':
        return (
          <>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <div style={{marginBottom: '8px'}}>
                <label style={styles.label} htmlFor="webhookUrl">URL du webhook</label>
                <input
                  style={styles.input}
                  id="webhookUrl"
                  placeholder="https://hooks.example.com/services/xxxxx"
                  value={(newIntegration.configuration as any)?.url || ''}
                  onChange={(e) => updateConfiguration('url', e.target.value)}
                />
              </div>
              <div style={{marginBottom: '8px'}}>
                <label style={styles.label} htmlFor="webhookMethod">Méthode HTTP</label>
                <select 
                  style={styles.select}
                  id="webhookMethod"
                  value={(newIntegration.configuration as any)?.method || 'POST'}
                  onChange={(e) => updateConfiguration('method', e.target.value)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
            </div>
          </>
        );
      
      // Autres types...
      
      default:
        return (
          <div style={{marginBottom: '8px'}}>
            <label style={styles.label} htmlFor="configJson">Configuration JSON</label>
            <textarea
              style={{...styles.textarea, fontFamily: 'monospace'}}
              id="configJson"
              placeholder="{}"
              rows={5}
              value={JSON.stringify(newIntegration.configuration || {}, null, 2)}
              onChange={(e) => {
                try {
                  const config = JSON.parse(e.target.value);
                  updateIntegrationField('configuration', config);
                } catch (error) {
                  // Ignorer les erreurs d'analyse JSON pendant la saisie
                }
              }}
            />
          </div>
        );
    }
  };
  
  return (
    <form onSubmit={handleCreateIntegration}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Créer une nouvelle intégration</h3>
          <p style={styles.cardDescription}>
            Configurez une nouvelle intégration système pour étendre les capacités de Lisa
          </p>
        </div>
        
        <div style={{...styles.cardContent, display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <div style={{marginBottom: '8px'}}>
            <label style={styles.label} htmlFor="name">Nom de l'intégration *</label>
            <input
              style={styles.input}
              id="name"
              placeholder="Nom de l'intégration"
              value={newIntegration.name || ''}
              onChange={(e) => updateIntegrationField('name', e.target.value)}
              required
            />
          </div>
          
          <div style={{marginBottom: '8px'}}>
            <label style={styles.label} htmlFor="type">Type d'intégration *</label>
            <select 
              style={styles.select}
              id="type"
              value={newIntegration.type || 'api'} 
              onChange={(e) => updateIntegrationField('type', e.target.value as SystemIntegrationType)}
            >
              <option value="" disabled>Sélectionner un type d'intégration</option>
              {SYSTEM_INTEGRATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <input
              type="checkbox"
              id="enabled"
              checked={newIntegration.enabled}
              onChange={(e) => updateIntegrationField('enabled', e.target.checked)}
              style={{width: 'auto'}}
            />
            <label style={{...styles.label, margin: 0}} htmlFor="enabled">Activer cette intégration</label>
          </div>
          
          <hr style={styles.separator} />
          
          <div style={{marginBottom: '8px'}}>
            <h3 style={{fontSize: '1.125rem', fontWeight: '500', marginBottom: '8px'}}>Configuration</h3>
            {getConfigurationFields()}
          </div>
          
          <hr style={styles.separator} />
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <h3 style={{fontSize: '1.125rem', fontWeight: '500', marginBottom: '8px'}}>Métadonnées</h3>
            
            <div style={{marginBottom: '8px'}}>
              <label style={styles.label} htmlFor="description">Description</label>
              <textarea
                style={styles.textarea}
                id="description"
                placeholder="Description de cette intégration..."
                value={newIntegration.metadata?.description || ''}
                onChange={(e) => updateMetadata('description', e.target.value)}
              />
            </div>
            
            <div style={{marginBottom: '8px'}}>
              <label style={styles.label} htmlFor="tags">Tags (séparés par des virgules)</label>
              <input
                style={styles.input}
                id="tags"
                placeholder="api, weather, service..."
                value={(newIntegration.metadata?.tags || []).join(', ')}
                onChange={(e) => updateMetadata('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
              />
            </div>
          </div>
        </div>
        
        <div style={{...styles.cardFooter, display: 'flex', justifyContent: 'space-between'}}>
          <button 
            style={styles.outlineButton} 
            type="button" 
            onClick={() => onSuccess()}
          >
            Annuler
          </button>
          <button 
            style={{...styles.button, ...(isLoading ? styles.disabledButton : {})}} 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? 'Création...' : 'Créer l\'intégration'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default SystemIntegrationPanel;
