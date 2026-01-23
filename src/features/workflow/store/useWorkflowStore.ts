import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { Node, Edge } from 'reactflow';
import type {
  AllCredentials,
  ExecutionLog,
  ExecutionHistoryEntry,
  GlobalVariables,
  Environments,
  Collaborator,
  WorkflowVersions,
  WebhookEndpoints,
  ScheduledJobs,
  ExecutionStats,
  SystemSettings,
  ClipboardData,
  WorkflowTemplates,
  SavedWorkflows,
} from './workflowStoreTypes';

// Définition des types pour le store
// ... imports

// Définition des types pour le store
export interface WorkflowState {
  // État de base
  nodes: Node[];
  edges: Edge[];

  // Undo/Redo history
  past: Array<{ nodes: Node[]; edges: Edge[] }>;
  future: Array<{ nodes: Node[]; edges: Edge[] }>;

  // Undo/Redo actions
  undo: () => void;
  redo: () => void;
  takeSnapshot: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // ... rest of the interface
  clipboard: ClipboardData | null;
  selectedNode: Node | null;
  isExecuting: boolean;
  executionResults: Record<string, unknown>;
  executionErrors: Record<string, string | Error>;
  currentExecutingNode: string | null;
  lastAddedNodeId: string | null;

  // Workflows et templates
  workflows: SavedWorkflows;
  currentWorkflowId: string | null;
  workflowTemplates: WorkflowTemplates;

  // Credentials management
  credentials: AllCredentials;

  // Exécution et historique
  executionHistory: ExecutionHistoryEntry[];
  executionLogs: ExecutionLog[];
  globalVariables: GlobalVariables;
  environments: Environments;
  currentEnvironment: string;

  // Configuration avancée
  debugMode: boolean;
  stepByStep: boolean;
  darkMode: boolean;
  collaborators: Collaborator[];
  workflowVersions: WorkflowVersions;
  webhookEndpoints: WebhookEndpoints;
  scheduledJobs: ScheduledJobs;

  // Statistiques détaillées
  executionStats: ExecutionStats;

  // Paramètres système
  systemSettings: SystemSettings;

  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNode: (node: Node | null) => void;
  setLastAddedNodeId: (nodeId: string | null) => void;
  addNode: (node: Node) => void;
  updateNode: (id: string, data: Partial<Node['data']>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  updateCredentials: (service: string, credentials: Partial<AllCredentials[keyof AllCredentials]>) => void;
  generateWebhookUrl: (workflowId: string) => string;
  scheduleWorkflow: (workflowId: string, cronExpression: string) => string;
  createVersion: (workflowId: string, message: string) => void;
  addLog: (log: Omit<ExecutionLog, 'timestamp'>) => void;
  setExecuting: (isExecuting: boolean) => void;
  setExecutionResults: (results: Record<string, unknown>) => void;
  setExecutionErrors: (errors: Record<string, string | Error>) => void;
  setCurrentExecutingNode: (nodeId: string | null) => void;
  clearExecution: () => void;
  toggleDebugMode: () => void;
  toggleStepByStep: () => void;
  toggleDarkMode: () => void;
  setCurrentEnvironment: (env: string) => void;
  addWorkflow: (workflow: SavedWorkflows[string]) => void;
  loadWorkflow: (workflowId: string) => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
}

// Store Zustand complet avec toutes les fonctionnalités n8n
const useWorkflowStore = create<WorkflowState>()(
  devtools(
    persist(
      (set, get) => ({
        // État de base
        nodes: [],
        edges: [],

        // Undo/Redo history
        past: [],
        future: [],

        // Undo/Redo actions
        undo: () => {
          const { past, future, nodes, edges } = get();
          if (past.length === 0) return;

          const previous = past[past.length - 1];
          const newPast = past.slice(0, past.length - 1);

          set({
            nodes: previous.nodes,
            edges: previous.edges,
            past: newPast,
            future: [{ nodes, edges }, ...future],
            canUndo: newPast.length > 0,
            canRedo: true,
          });
        },

        redo: () => {
          const { past, future, nodes, edges } = get();
          if (future.length === 0) return;

          const next = future[0];
          const newFuture = future.slice(1);

          set({
            nodes: next.nodes,
            edges: next.edges,
            past: [...past, { nodes, edges }],
            future: newFuture,
            canUndo: true,
            canRedo: newFuture.length > 0,
          });
        },

        takeSnapshot: () => {
          const { nodes, edges, past } = get();
          // Limit history to 50 entries
          const newPast = [...past, { nodes, edges }].slice(-50);
          set({
            past: newPast,
            future: [],
            canUndo: true,
            canRedo: false,
          });
        },

        canUndo: false,
        canRedo: false,
        clipboard: null,
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
            id: 'welcome-email',
            name: 'Email de bienvenue',
            description: 'Envoie un email de bienvenue aux nouveaux utilisateurs',
            category: 'Marketing',
            nodes: [],
            edges: [],
          },
          'data-sync': {
            id: 'data-sync',
            name: 'Synchronisation de données',
            description: 'Synchronise les données entre deux systèmes',
            category: 'Data',
            nodes: [],
            edges: [],
          },
          'social-media': {
            id: 'social-media',
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
          maxExecutionTime: 300000,
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
        setNodes: (nodes: Node[]) => {
          get().takeSnapshot();
          set({ nodes });
        },
        setEdges: (edges: Edge[]) => {
          get().takeSnapshot();
          set({ edges });
        },
        setSelectedNode: (node: Node | null) => set({ selectedNode: node }),
        setLastAddedNodeId: (nodeId: string | null) => set({ lastAddedNodeId: nodeId }),

        addNode: (node: Node) => {
          get().takeSnapshot();
          set((state) => ({ nodes: [...state.nodes, node] }));
          get().setLastAddedNodeId(node.id);
        },

        updateNode: (id: string, data: Partial<Node['data']>) => {
          get().takeSnapshot();
          set((state) => ({
            nodes: state.nodes.map((node) =>
              node.id === id ? { ...node, data: { ...node.data, ...data } } : node
            ),
          }));
        },

        deleteNode: (id: string) => {
          get().takeSnapshot();
          set((state) => ({
            nodes: state.nodes.filter((node) => node.id !== id),
            edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
          }));
        },

        duplicateNode: (id: string) => {
          const nodeToDuplicate = get().nodes.find((n) => n.id === id);
          if (nodeToDuplicate) {
            get().takeSnapshot();
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
        updateCredentials: (service: string, credentials: Partial<AllCredentials[keyof AllCredentials]>) => set((state) => ({
          credentials: {
            ...state.credentials,
            [service]: { ...state.credentials[service as keyof AllCredentials], ...credentials }
          } as AllCredentials
        })),

        // Webhooks
        generateWebhookUrl: (workflowId: string) => {
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
        scheduleWorkflow: (workflowId: string, cronExpression: string) => {
          const jobId = `job_${Date.now()}`;
          set((state) => ({
            scheduledJobs: {
              ...state.scheduledJobs,
              [jobId]: {
                workflowId,
                cronExpression,
                enabled: true,
                lastRun: null,
                nextRun: null,
              }
            }
          }));
          return jobId;
        },

        // Version control
        createVersion: (workflowId: string, message: string) => {
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
        addLog: (log: Omit<ExecutionLog, 'timestamp'>) => set((state) => ({
          executionLogs: [
            ...state.executionLogs,
            {
              ...log,
              timestamp: new Date().toISOString(),
            } as ExecutionLog
          ]
        })),

        // Execution control
        setExecuting: (isExecuting: boolean) => set({ isExecuting }),
        setExecutionResults: (results: Record<string, unknown>) => set((state) => ({
          executionResults: { ...state.executionResults, ...results }
        })),
        setExecutionErrors: (errors: Record<string, string | Error>) => set((state) => ({
          executionErrors: { ...state.executionErrors, ...errors }
        })),
        setCurrentExecutingNode: (nodeId: string | null) => set({ currentExecutingNode: nodeId }),

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
        setCurrentEnvironment: (env: string) => set({ currentEnvironment: env }),

        // Workflow management
        addWorkflow: (workflow: SavedWorkflows[string]) => set((state) => ({
          workflows: { ...state.workflows, [workflow.id]: workflow }
        })),
        loadWorkflow: (workflowId: string) => {
          const workflow = get().workflows[workflowId];
          if (workflow) {
            set({
              nodes: (workflow.nodes as unknown as Node[]) || [],
              edges: (workflow.edges as unknown as Edge[]) || [],
              currentWorkflowId: workflowId
            });
          }
        },

        // Clipboard operations
        copy: () => {
          const state = get();
          const selectedNodes = state.nodes.filter((node: Node) => node.selected);
          const selectedEdges = state.edges.filter((edge: Edge) => edge.selected);
          set({ clipboard: { nodes: selectedNodes, edges: selectedEdges } });
        },

        cut: () => {
          const state = get();
          get().takeSnapshot();
          const selectedNodes = state.nodes.filter((node: Node) => node.selected);
          const selectedEdges = state.edges.filter((edge: Edge) => edge.selected);
          set({
            clipboard: { nodes: selectedNodes, edges: selectedEdges },
            nodes: state.nodes.filter((node: Node) => !node.selected),
            edges: state.edges.filter((edge: Edge) => !edge.selected)
          });
        },

        paste: () => {
          const state = get();
          if (!state.clipboard || state.clipboard.nodes.length === 0) return;

          get().takeSnapshot();

          const newNodes: Node[] = [];
          const newEdges: Edge[] = [];
          const oldNodeIdMap = new Map<string, string>();

          state.clipboard.nodes.forEach((node: Node) => {
            const newNodeId = `${node.id}_copy_${Date.now()}`;
            newNodes.push({
              ...node,
              id: newNodeId,
              position: { x: node.position.x + 50, y: node.position.y + 50 },
              selected: false,
            });
            oldNodeIdMap.set(node.id, newNodeId);
          });

          state.clipboard.edges.forEach((edge: Edge) => {
            const newSource = oldNodeIdMap.get(edge.source);
            const newTarget = oldNodeIdMap.get(edge.target);

            if (newSource && newTarget) {
              newEdges.push({
                ...edge,
                id: `${edge.id}_copy_${Date.now()}`,
                source: newSource,
                target: newTarget,
                selected: false,
              });
            }
          });

          set({
            nodes: [...state.nodes, ...newNodes],
            edges: [...state.edges, ...newEdges]
          });
        },
      }),
      {
        name: 'workflow-storage',
        partialize: (state: WorkflowState) => ({
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
  )
);

export default useWorkflowStore;
