import { memo, useEffect } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useAppStore } from '../../store/appStore';
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
  const { setSelectedNode, lastAddedNodeId, setLastAddedNodeId } = useAppStore(state => state.workflow);
  const nodeExecutionStatus = useAppStore(state => state.workflow.nodeExecutionStatus[id]);

  const nodeType = data.type;
  const nodeInfo = nodeTypes[nodeType] as NodeType;
  
  // Get n8n-inspired styles and shapes
  const style = nodeStyles[nodeType] || nodeStyles.default;
  const category = nodeInfo?.category || 'default';
  const shape = nodeShapes[category] || nodeShapes.default;

  // État d'exécution du nœud
  const isCurrentlyExecuting = nodeExecutionStatus === 'running';
  const hasExecuted = nodeExecutionStatus === 'success' || nodeExecutionStatus === 'failed' || nodeExecutionStatus === 'skipped';
  const hasError = nodeExecutionStatus === 'failed';
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
  
  const borderClass = () => {
    switch (nodeExecutionStatus) {
      case 'running': return 'border-blue-500 ring-2 ring-blue-500';
      case 'success': return 'border-green-500 ring-2 ring-green-500';
      case 'failed': return 'border-red-500 ring-2 ring-red-500';
      case 'skipped': return 'border-gray-400 opacity-50';
      default: return style.border || 'border-gray-300';
    }
  };

  const backgroundClass = () => {
    switch (nodeExecutionStatus) {
      case 'running': return 'bg-blue-100';
      case 'success': return 'bg-green-100';
      case 'failed': return 'bg-red-100';
      case 'skipped': return 'bg-gray-100';
      default: return 'bg-white';
    }
  };
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
