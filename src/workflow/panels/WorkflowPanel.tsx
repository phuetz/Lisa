import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Panel,
  BackgroundVariant,
  type Node,
  type NodeChange,
  type NodeTypes,
  type EdgeChange,
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import useWorkflowStore from '../store/useWorkflowStore';
import CustomNode from '../nodes/CustomNode';
import { nodeTypes, nodeCategories, nodeStyles, nodeShapes } from '../nodes/nodeTypes';
import NodeConfigPanel from './NodeConfigPanel';
import WorkflowToolbar from './WorkflowToolbar';



// Type de nœuds personnalisés pour ReactFlow
const nodeTypesMap: NodeTypes = {
  customNode: CustomNode,
};

// Composant principal du panneau de workflow
const WorkflowPanel: React.FC = () => {
  // Récupérer les données du store
  const nodes = useWorkflowStore(state => state.nodes);
  const edges = useWorkflowStore(state => state.edges);
  const selectedNode = useWorkflowStore(state => state.selectedNode);
  const setNodes = useWorkflowStore(state => state.setNodes);
  const setEdges = useWorkflowStore(state => state.setEdges);
  const setSelectedNode = useWorkflowStore(state => state.setSelectedNode);
  const darkMode = useWorkflowStore(state => state.darkMode);
  const isExecuting = useWorkflowStore(state => state.isExecuting);
  const clearExecution = useWorkflowStore(state => state.clearExecution);
  
  // États locaux
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtrer les types de nœuds selon la recherche et la catégorie
  const filteredNodeTypes = useMemo(() => {
    return Object.entries(nodeTypes)
      .filter(([_, nodeType]) => {
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          return (
            nodeType.name.toLowerCase().includes(searchLower) ||
            nodeType.description.toLowerCase().includes(searchLower) ||
            nodeType.category.toLowerCase().includes(searchLower)
          );
        }
        
        return true;
      })
      .map(([key, nodeType]) => ({ key, ...nodeType }));
  }, [searchTerm]);
  
  // Gestionnaires d'événements ReactFlow
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes(applyNodeChanges(changes, nodes));
    },
    [nodes, setNodes]
  );
  
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(applyEdgeChanges(changes, edges));
    },
    [edges, setEdges]
  );
  
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(addEdge(connection, edges));
    },
    [edges, setEdges]
  );
  

  
  // Gestionnaire pour l'ajout d'un nouveau nœud depuis la barre latérale
  const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);
  
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType || !nodeTypes[nodeType]) return;
      
      // Récupérer la position de la souris dans le pane
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };
      
      // Créer un nouveau nœud
      const newNode: Node = {
        id: `${nodeType}_${Date.now()}`,
        type: 'customNode',
        position,
        data: {
          label: nodeTypes[nodeType].name,
          type: nodeType,
          config: {},
          description: nodeTypes[nodeType].description,
        },
      };
      
      setNodes([...nodes, newNode]);
      setSelectedNode(newNode);
    },
    [nodes, setNodes, setSelectedNode]
  );
  
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  
  // Effet pour nettoyer l'exécution précédente lorsque les nœuds ou les arêtes changent
  useEffect(() => {
    if (!isExecuting) {
      clearExecution();
    }
  }, [nodes, edges, isExecuting, clearExecution]);
  
  // Rendu de la barre latérale avec la liste des nœuds
  const renderSidebar = () => {
    if (!sidebarOpen) return null;

    return (
      <div className={`w-80 flex flex-col bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Nodes</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Drag & drop to build your workflow</p>
          <input
            type="text"
            placeholder="Search nodes..."
            className="w-full mt-4 p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-grow overflow-auto p-2">
          {nodeCategories.map((category) => (
            <div key={category.id} className="mb-4">
              <h3 className="px-2 py-1 text-sm font-semibold text-gray-600 dark:text-gray-300">{category.name}</h3>
              <div className="grid grid-cols-1 gap-2 mt-1">
                {filteredNodeTypes
                  .filter((node) => node.category === category.id)
                  .map((nodeType) => {
                    const style = nodeStyles[nodeType.key] || nodeStyles.default;
                    const shape = nodeShapes[nodeType.category] || nodeShapes.default;
                    return (
                                            <div
                        key={nodeType.key}
                        className={`p-2 flex items-center bg-white dark:bg-gray-900 rounded-lg border-2 border-transparent hover:border-blue-500 cursor-grab transition-all`}
                        onDragStart={(e) => onDragStart(e, nodeType.key)}
                        draggable
                      >
                        <div className={`flex-shrink-0 flex items-center justify-center text-white ${shape.width} ${shape.height} ${shape.shapeClass} ${style.border}`}>
                          <div className="text-2xl">{style.icon}</div>
                        </div>
                        <div className="ml-4">
                          <div className="font-bold text-sm text-gray-800 dark:text-white">{nodeType.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{nodeType.description}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className={`w-full h-full ${darkMode ? 'dark' : ''}`}>
      <div className="flex h-full">
        {/* Barre latérale avec les nœuds disponibles */}
        {renderSidebar()}
        
        {/* Éditeur de flux */}
        <div className="flex-grow h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypesMap}
            fitView
            deleteKeyCode="Delete"
            onDrop={onDrop}
            onDragOver={onDragOver}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#9CA3AF', strokeWidth: 1.5 },
            }}
          >
            <Background color={darkMode ? '#3B3B3B' : '#E0E0E0'} variant={BackgroundVariant.Dots} gap={15} size={1} />
            <Controls />
            
            {/* Barre d'outils flottante */}
            <Panel position="top-left">
              <WorkflowToolbar sidebarOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            </Panel>
          </ReactFlow>
        </div>
        
        {/* Panneau de configuration du nœud sélectionné */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
};

export default WorkflowPanel;
