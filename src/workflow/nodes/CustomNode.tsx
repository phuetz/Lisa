import { memo, useEffect } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import useWorkflowStore from '../store/useWorkflowStore';
import { nodeTypes, nodeStyles, nodeShapes } from './nodeTypes';
import type { NodeType } from './nodeTypes';

interface CustomNodeData {
  label: string;
  type: string;
  config?: Record<string, any>;
  description?: string;
}



// Composant de nœud personnalisé avec styles dynamiques
const CustomNode = memo(({ id, data, isConnectable, selected, xPos, yPos }: NodeProps<CustomNodeData>) => {
  const { setSelectedNode, lastAddedNodeId, setLastAddedNodeId } = useWorkflowStore();
  
  const executionResults = useWorkflowStore(state => state.executionResults[id]);
  const executionErrors = useWorkflowStore(state => state.executionErrors[id]);
  const isExecuting = useWorkflowStore(state => state.isExecuting);
  const currentExecutingNode = useWorkflowStore(state => state.currentExecutingNode);
  
  const nodeType = data.type;
  const nodeInfo = nodeTypes[nodeType] as NodeType;
  
  // Get n8n-inspired styles and shapes
  const style = nodeStyles[nodeType] || nodeStyles.default;
  const category = nodeInfo?.category || 'default';
  const shape = nodeShapes[category] || nodeShapes.default;

  // État d'exécution du nœud
  const isCurrentlyExecuting = isExecuting && currentExecutingNode === id;
  const hasExecuted = executionResults !== undefined;
    const hasError = executionErrors !== undefined;
  const isNew = lastAddedNodeId === id;

  useEffect(() => {
    if (isNew) {
      // Reset the animation state after it has played
      const timer = setTimeout(() => {
        setLastAddedNodeId(null);
      }, 500); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isNew, setLastAddedNodeId]);
  
  return (
    <div
      className={`
        bg-white border-2 border-dashed shadow-md transition-all flex flex-col justify-center items-center
        ${shape.width} ${shape.height} ${shape.shapeClass}
        ${style.border}
        ${selected ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
                ${isCurrentlyExecuting ? 'animate-pulse' : ''}
        ${isNew ? 'node-enter' : ''}
        ${hasError ? 'ring-2 ring-red-500' : ''}
      `}
      onClick={() => setSelectedNode({ id, data, position: { x: xPos, y: yPos } })}
    >
      {/* Input Handles */}
      {nodeInfo?.inputs?.map((input, index) => (
        <Handle
          key={`input-${index}`}
          type="target"
          position={Position.Left}
          id={input.id}
          className="!w-2 !h-2 !bg-gray-800 hover:!bg-blue-500"
          isConnectable={isConnectable}
        />
      ))}

      {/* Node Content */}
      <div className="flex flex-col items-center text-center p-2">
        <div className="text-2xl">{style.icon}</div>
        <div className="mt-1 font-bold text-xs text-gray-800">{data.label}</div>
        {/* Configuration preview */}
        {Object.entries(data.config || {}).length > 0 && (
          <div className="mt-1 text-xxs text-gray-500 truncate w-full">
            {Object.entries(data.config || {}).map(([key, value]) => 
              `${key}: ${String(value)}`).join(', ')}
          </div>
        )}
      </div>

      {/* Status Indicators */}
      <div className="absolute top-1 right-1 flex items-center space-x-1">
        {hasExecuted && !hasError && <div className="w-2 h-2 bg-green-500 rounded-full" title="Success"></div>}
        {hasError && <div className="w-2 h-2 bg-red-500 rounded-full" title="Error"></div>}
      </div>

      {/* Output Handles */}
      {nodeInfo?.outputs?.map((output, index) => (
        <Handle
          key={`output-${index}`}
          type="source"
          position={Position.Right}
          id={output.id}
          className="!w-2 !h-2 !bg-gray-800 hover:!bg-blue-500"
          isConnectable={isConnectable}
        />
      ))}
    </div>
  );
});

export default CustomNode;
