import React, { useCallback, useState } from 'react';
import useWorkflowStore from '../store/useWorkflowStore';
import { WorkflowExecutor } from '../executor/WorkflowExecutor';

interface WorkflowToolbarProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

// Barre d'outils flottante pour l'éditeur de workflow
const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({ sidebarOpen, toggleSidebar }) => {
  const [executing, setExecuting] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  
  // Accès au store
  const nodes = useWorkflowStore(state => state.nodes);
  const edges = useWorkflowStore(state => state.edges);
  const isExecuting = useWorkflowStore(state => state.isExecuting);
  const darkMode = useWorkflowStore(state => state.darkMode);
  const setExecuting = useWorkflowStore(state => state.setExecuting);
  const setExecutionResults = useWorkflowStore(state => state.setExecutionResults);
  const setExecutionErrors = useWorkflowStore(state => state.setExecutionErrors);
  const setCurrentExecutingNode = useWorkflowStore(state => state.setCurrentExecutingNode);
  const addWorkflow = useWorkflowStore(state => state.addWorkflow);
  const workflows = useWorkflowStore(state => state.workflows);
  const loadWorkflow = useWorkflowStore(state => state.loadWorkflow);
  const toggleDarkMode = useWorkflowStore(state => state.toggleDarkMode);
  const undo = useWorkflowStore(state => state.undo);
  const redo = useWorkflowStore(state => state.redo);
  const canUndo = useWorkflowStore(state => state.canUndo);
  const canRedo = useWorkflowStore(state => state.canRedo);
  const copy = useWorkflowStore(state => state.copy);
  const cut = useWorkflowStore(state => state.cut);
  const paste = useWorkflowStore(state => state.paste);
  
  // Exécution du workflow
  const executeWorkflow = useCallback(async () => {
    if (nodes.length === 0) return;
    
    setExecuting(true);
    setExecutionResults({});
    setExecutionErrors({});
    
    // Configuration de l'exécuteur
    const executor = new WorkflowExecutor({
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.data.type,
        config: node.data.config || {}
      })),
      edges: edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle
      })),
      stepByStep: false,
      debugMode: true
    });
    
    try {
      // Pour simuler une exécution pas à pas
      for (const node of nodes) {
        setCurrentExecutingNode(node.id);
        // Pause pour simuler le traitement
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Exécution réelle
      const result = await executor.execute();
      
      // Mise à jour des résultats
      setExecutionResults(result.nodeResults);
      if (!result.success) {
        setExecutionErrors(result.errors);
      }
    } catch (error) {
      setExecutionErrors({
        global: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setExecuting(false);
      setCurrentExecutingNode(null);
    }
  }, [nodes, edges, setExecutionResults, setExecutionErrors, setCurrentExecutingNode]);
  
  // Sauvegarde du workflow
  const handleSaveWorkflow = useCallback(() => {
    if (!workflowName) return;
    
    const workflowId = `workflow_${Date.now()}`;
    addWorkflow({
      id: workflowId,
      name: workflowName,
      description: workflowDescription,
      nodes,
      edges,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    });
    
    setSaveDialogOpen(false);
    setWorkflowName('');
    setWorkflowDescription('');
  }, [workflowName, workflowDescription, nodes, edges, addWorkflow]);
  
  // Création d'un nouveau workflow vide
  const handleNewWorkflow = useCallback(() => {
    if (nodes.length > 0) {
      if (!window.confirm('Voulez-vous vraiment créer un nouveau workflow ? Les changements non sauvegardés seront perdus.')) {
        return;
      }
    }
    
    useWorkflowStore.setState({
      nodes: [],
      edges: [],
      selectedNode: null,
      executionResults: {},
      executionErrors: {},
      currentExecutingNode: null,
      currentWorkflowId: null
    });
  }, [nodes.length]);
  
  // Thème
  const theme = darkMode
    ? 'bg-gray-800 text-white'
    : 'bg-white text-gray-800';
  
  // Rendu du dialogue de sauvegarde
  const renderSaveDialog = () => {
    if (!saveDialogOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow-xl max-w-md w-full`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Sauvegarder le workflow
          </h2>
          
          <div className="mb-4">
            <label className={`block mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Nom du workflow
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 border rounded-md ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Mon workflow"
            />
          </div>
          
          <div className="mb-6">
            <label className={`block mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Description
            </label>
            <textarea
              className={`w-full px-3 py-2 border rounded-md ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              placeholder="Description du workflow..."
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              className={`px-4 py-2 rounded-md ${
                darkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
              }`}
              onClick={() => setSaveDialogOpen(false)}
            >
              Annuler
            </button>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
              onClick={handleSaveWorkflow}
              disabled={!workflowName}
            >
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <>
      <div className={`p-2 rounded-md shadow-lg ${theme} flex items-center gap-2`}>
        {/* Bouton toggle sidebar */}
        <button
          className={`p-2 rounded hover:bg-gray-200 hover:bg-opacity-20`}
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Masquer la barre latérale' : 'Afficher la barre latérale'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
        
        {/* Bouton nouveau workflow */}
        <button
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleNewWorkflow}
        >
          Nouveau
        </button>
        
        {/* Bouton sauvegarder */}
        <button
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={() => setSaveDialogOpen(true)}
          disabled={nodes.length === 0}
        >
          Sauvegarder
        </button>
        
        {/* Menu déroulant des workflows */}
        <div className="relative group">
          <button
            className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Charger
          </button>
          
          <div className="absolute left-0 mt-1 w-64 bg-white dark:bg-gray-800 shadow-lg rounded-md overflow-hidden hidden group-hover:block z-10">
            {Object.values(workflows).length === 0 ? (
              <div className="p-3 text-gray-500 dark:text-gray-400 text-sm">
                Aucun workflow sauvegardé
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {Object.values(workflows).map((workflow: any) => (
                  <button
                    key={workflow.id}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => loadWorkflow(workflow.id)}
                  >
                    <div className="font-medium">{workflow.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {workflow.description || 'Aucune description'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Séparateur */}
        <div className="h-6 border-l border-gray-300 dark:border-gray-700 mx-1"></div>
        
        {/* Bouton exécuter */}
        <button
          className={`px-3 py-1 rounded ${
            isExecuting
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-yellow-500 hover:bg-yellow-600'
          } text-white`}
          onClick={executeWorkflow}
          disabled={isExecuting || nodes.length === 0}
        >
          {isExecuting ? 'Exécution en cours...' : 'Exécuter'}
        </button>
        
        {/* Séparateur */}
        <div className="h-6 border-l border-gray-300 dark:border-gray-700 mx-1"></div>
        
        {/* Bouton mode sombre */}
        <button
          className="p-2 rounded hover:bg-gray-200 hover:bg-opacity-20"
          onClick={toggleDarkMode}
          title={darkMode ? 'Mode clair' : 'Mode sombre'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {/* Boutons Undo/Redo */}
        <button
          className="px-3 py-1 rounded hover:bg-gray-200 hover:bg-opacity-20"
          onClick={undo}
          disabled={!canUndo}
          title="Annuler"
        >
          ↩️
        </button>
        <button
          className="px-3 py-1 rounded hover:bg-gray-200 hover:bg-opacity-20"
          onClick={redo}
          disabled={!canRedo}
          title="Rétablir"
        >
          ↪️
        </button>

        {/* Boutons Copier/Couper/Coller */}
        <button
          className="px-3 py-1 rounded hover:bg-gray-200 hover:bg-opacity-20"
          onClick={copy}
          title="Copier les nœuds sélectionnés"
        >
          📋
        </button>
        <button
          className="px-3 py-1 rounded hover:bg-gray-200 hover:bg-opacity-20"
          onClick={cut}
          title="Couper les nœuds sélectionnés"
        >
          ✂️
        </button>
        <button
          className="px-3 py-1 rounded hover:bg-gray-200 hover:bg-opacity-20"
          onClick={paste}
          title="Coller les nœuds"
        >
          貼り付け
        </button>
      </div>
      
      {/* Dialogue de sauvegarde */}
      {renderSaveDialog()}
    </>
  );
};

export default WorkflowToolbar;
