import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from 'reactflow';

// Définition des types pour le store
export interface WorkflowState {
  // État de base
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  isExecuting: boolean;
  executionResults: Record<string, any>;
  executionErrors: Record<string, any>;
  currentExecutingNode: string | null;
  lastAddedNodeId: string | null;

  // Workflows et templates
  workflows: Record<string, any>;
  currentWorkflowId: string | null;
  workflowTemplates: Record<string, any>;

  // Credentials management
  credentials: {
    [key: string]: any;
    google: { clientId: string; clientSecret: string; refreshToken: string };
    aws: { accessKeyId: string; secretAccessKey: string; region: string };
    openai: { apiKey: string };
    stripe: { apiKey: string };
    slack: { webhookUrl: string };
    github: { token: string };
  };

  // Exécution et historique
  executionHistory: any[];
  executionLogs: any[];
  globalVariables: Record<string, any>;
  environments: Record<string, { name: string; apiUrl: string; apiKey: string }>;
  currentEnvironment: string;

  // Configuration avancée
  debugMode: boolean;
  stepByStep: boolean;
  darkMode: boolean;
  collaborators: any[];
  workflowVersions: Record<string, any>;
  webhookEndpoints: Record<string, any>;
  scheduledJobs: Record<string, any>;

  // Statistiques détaillées
  executionStats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    nodeStats: Record<string, any>;
    errorStats: Record<string, any>;
  };

  // Paramètres système
  systemSettings: {
    maxExecutionTime: number;
    maxRetries: number;
    rateLimits: Record<string, any>;
    notifications: {
      onError: boolean;
      onSuccess: boolean;
      webhookUrl: string;
      email: string;
    };
  };

  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNode: (node: Node | null) => void;
  setLastAddedNodeId: (nodeId: string | null) => void;
  addNode: (node: Node) => void;
  updateNode: (id: string, data: any) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  updateCredentials: (service: string, credentials: any) => void;
  generateWebhookUrl: (workflowId: string) => string;
  scheduleWorkflow: (workflowId: string, cronExpression: string) => string;
  createVersion: (workflowId: string, message: string) => void;
  addLog: (log: { level: string; message: string; data?: any }) => void;
  setExecuting: (isExecuting: boolean) => void;
  setExecutionResults: (results: Record<string, any>) => void;
  setExecutionErrors: (errors: Record<string, any>) => void;
  setCurrentExecutingNode: (nodeId: string | null) => void;
  clearExecution: () => void;
  toggleDebugMode: () => void;
  toggleStepByStep: () => void;
  toggleDarkMode: () => void;
  setCurrentEnvironment: (env: string) => void;
  addWorkflow: (workflow: any) => void;
  loadWorkflow: (workflowId: string) => void;
}

// Store Zustand complet avec toutes les fonctionnalités n8n
const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      // État de base
      nodes: [],
      edges: [],
      selectedNode: null,
      isExecuting: false,
      executionResults: {},
      executionErrors: {},
      currentExecutingNode: null,
      lastAddedNodeId: null,

      // Workflows et templates
      workflows: {},
      currentWorkflowId: null,
      workflowTemplates: {
        'welcome-email': {
          name: 'Email de bienvenue',
          description: 'Envoie un email de bienvenue aux nouveaux utilisateurs',
          category: 'Marketing',
          nodes: [], // Template nodes
          edges: [], // Template edges
        },
        'data-sync': {
          name: 'Synchronisation de données',
          description: 'Synchronise les données entre deux systèmes',
          category: 'Data',
          nodes: [],
          edges: [],
        },
        'social-media': {
          name: 'Publication réseaux sociaux',
          description: 'Publie automatiquement sur les réseaux sociaux',
          category: 'Social',
          nodes: [],
          edges: [],
        },
      },

      // Credentials management
      credentials: {
        google: { clientId: '', clientSecret: '', refreshToken: '' },
        aws: { accessKeyId: '', secretAccessKey: '', region: 'us-east-1' },
        openai: { apiKey: '' },
        stripe: { apiKey: '' },
        slack: { webhookUrl: '' },
        github: { token: '' },
      },

      // Exécution et historique
      executionHistory: [],
      executionLogs: [],
      globalVariables: {},
      environments: {
        dev: { name: 'Development', apiUrl: 'http://localhost:3000', apiKey: 'dev-key' },
        prod: { name: 'Production', apiUrl: 'https://api.myapp.com', apiKey: 'prod-key' },
      },
      currentEnvironment: 'dev',

      // Configuration avancée
      debugMode: false,
      stepByStep: false,
      darkMode: false,
      collaborators: [],
      workflowVersions: {},
      webhookEndpoints: {},
      scheduledJobs: {},

      // Statistiques détaillées
      executionStats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        nodeStats: {},
        errorStats: {},
      },

      // Paramètres système
      systemSettings: {
        maxExecutionTime: 300000, // 5 minutes
        maxRetries: 3,
        rateLimits: {},
        notifications: {
          onError: true,
          onSuccess: false,
          webhookUrl: '',
          email: '',
        },
      },

      // Actions de base
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      setSelectedNode: (node) => set({ selectedNode: node }),
      setLastAddedNodeId: (nodeId) => set({ lastAddedNodeId: nodeId }),

      addNode: (node) => {
        set((state) => ({ nodes: [...state.nodes, node] }));
        get().setLastAddedNodeId(node.id);
      },

      updateNode: (id, data) => set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...data } } : node
        ),
      })),

      deleteNode: (id) => set((state) => ({
        nodes: state.nodes.filter((node) => node.id !== id),
        edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
      })),

      duplicateNode: (id) => {
        const nodeToDuplicate = get().nodes.find((n) => n.id === id);
        if (nodeToDuplicate) {
          const newNode = {
            ...nodeToDuplicate,
            id: `${nodeToDuplicate.id}_copy_${Date.now()}`,
            data: { ...nodeToDuplicate.data },
            position: {
              x: nodeToDuplicate.position.x + 50,
              y: nodeToDuplicate.position.y + 50,
            },
          };
          set((state) => ({ nodes: [...state.nodes, newNode] }));
        }
      },

      // Gestion des credentials
      updateCredentials: (service, credentials) => set((state) => ({
        credentials: {
          ...state.credentials,
          [service]: { ...state.credentials[service], ...credentials }
        }
      })),
      
      // Webhooks
      generateWebhookUrl: (workflowId) => {
        const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const url = `https://app.workflow-editor.com/webhook/${webhookId}`;
        set((state) => ({
          webhookEndpoints: {
            ...state.webhookEndpoints,
            [webhookId]: { workflowId, url, created: new Date().toISOString() }
          }
        }));
        return url;
      },
      
      // Scheduling
      scheduleWorkflow: (workflowId, cronExpression) => {
        const jobId = `job_${Date.now()}`;
        set((state) => ({
          scheduledJobs: {
            ...state.scheduledJobs,
            [jobId]: {
              workflowId,
              cronExpression,
              enabled: true,
              lastRun: null,
              nextRun: null, // Calculate from cron
            }
          }
        }));
        return jobId;
      },
      
      // Version control
      createVersion: (workflowId, message) => {
        const workflow = get().workflows[workflowId];
        if (workflow) {
          const versionId = `v_${Date.now()}`;
          set((state) => ({
            workflowVersions: {
              ...state.workflowVersions,
              [workflowId]: [
                ...(state.workflowVersions[workflowId] || []),
                {
                  id: versionId,
                  message,
                  timestamp: new Date().toISOString(),
                  data: { ...workflow },
                  author: 'current-user',
                }
              ]
            }
          }));
        }
      },

      // Logs
      addLog: (log) => set((state) => ({
        executionLogs: [
          ...state.executionLogs,
          {
            ...log,
            timestamp: new Date().toISOString(),
          }
        ]
      })),
      
      // Execution control
      setExecuting: (isExecuting) => set({ isExecuting }),
      setExecutionResults: (results) => set((state) => ({ 
        executionResults: { ...state.executionResults, ...results } 
      })),
      setExecutionErrors: (errors) => set((state) => ({ 
        executionErrors: { ...state.executionErrors, ...errors } 
      })),
      setCurrentExecutingNode: (nodeId) => set({ currentExecutingNode: nodeId }),
      
      clearExecution: () => set({ 
        executionResults: {}, 
        executionErrors: {}, 
        currentExecutingNode: null 
      }),
      
      // Toggles
      toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
      toggleStepByStep: () => set((state) => ({ stepByStep: !state.stepByStep })),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      
      // Environment
      setCurrentEnvironment: (env) => set({ currentEnvironment: env }),
      
      // Workflow management
      addWorkflow: (workflow) => set((state) => ({ 
        workflows: { ...state.workflows, [workflow.id]: workflow } 
      })),
      loadWorkflow: (workflowId) => {
        const workflow = get().workflows[workflowId];
        if (workflow) {
          set({ 
            nodes: workflow.nodes || [], 
            edges: workflow.edges || [],
            currentWorkflowId: workflowId
          });
        }
      }
    }),
    {
      name: 'workflow-storage',
      partialize: (state) => ({
        workflows: state.workflows,
        credentials: state.credentials,
        workflowTemplates: state.workflowTemplates,
        globalVariables: state.globalVariables,
        environments: state.environments,
        darkMode: state.darkMode,
        systemSettings: state.systemSettings,
        workflowVersions: state.workflowVersions,
      }),
    }
  )
);

export default useWorkflowStore;
