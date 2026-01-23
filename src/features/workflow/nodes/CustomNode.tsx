import { memo, useEffect, useMemo } from 'react';
import { Handle, Position, type Node, type NodeProps } from 'reactflow';
import { nodeTypes, nodeStyles, nodeShapes } from './nodeTypes';
import type { NodeType } from './nodeTypes';
import useWorkflowStore from '../store/useWorkflowStore';
import type { WorkflowState } from '../store/useWorkflowStore';

interface CustomNodeData {
  label: string;
  type: string;
  config?: Record<string, unknown>;
  description?: string;
}

// Composant de nœud personnalisé avec styles dynamiques
const CustomNode = memo(({ id, data, isConnectable }: NodeProps<CustomNodeData>) => {
  const setSelectedNode = useWorkflowStore((state: WorkflowState) => state.setSelectedNode);
  const setLastAddedNodeId = useWorkflowStore((state: WorkflowState) => state.setLastAddedNodeId);
  const lastAddedNodeId = useWorkflowStore((state: WorkflowState) => state.lastAddedNodeId);
  const nodeExecutionStatus = useWorkflowStore((state: WorkflowState) => state.nodeExecutionStatus[id]);
  const nodes = useWorkflowStore((state: WorkflowState) => state.nodes);

  const nodeType = data.type;
  const nodeInfo = nodeTypes[nodeType] as NodeType | undefined;
  
  // Get n8n-inspired styles and shapes
  const style = nodeStyles[nodeType] || nodeStyles.default;
  const category = nodeInfo?.category ?? 'default';
  const shape = nodeShapes[category] || nodeShapes.default;
  const shapeClassName = `${shape.shapeClass} ${shape.width} ${shape.height}`.trim();

  // État d'exécution du nœud
  const isCurrentlyExecuting = nodeExecutionStatus === 'running';
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

  const configPreview = useMemo(() => {
    const entries = Object.entries(data.config ?? {});
    if (entries.length === 0) return null;
    return entries
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(', ');
  }, [data.config]);

  const handleSelectNode = (nodeId: string) => {
    const nodeToSelect = nodes.find((node: Node) => node.id === nodeId) ?? null;
    setSelectedNode(nodeToSelect);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => handleSelectNode(id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelectNode(id);
        }
      }}
      className={`relative ${shapeClassName} border-2 ${borderClass()} ${backgroundClass()} shadow-md transition-all ${isNew ? 'animate-pulse' : ''} ${isCurrentlyExecuting ? 'animate-pulse' : ''}`}
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
        {configPreview && (
          <div className="mt-1 text-xxs text-gray-500 truncate w-full">
            {configPreview}
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

CustomNode.displayName = 'CustomNode';

export default CustomNode;
