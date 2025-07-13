import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface SubWorkflowNodeData {
  label: string;
  workflowId: string;
}

const SubWorkflowNode: React.FC<NodeProps<SubWorkflowNodeData>> = ({ data }) => {
  return (
    <div
      style={{
        padding: 10,
        border: '1px solid #6A0DAD',
        borderRadius: 5,
        background: '#F3E8FF',
        textAlign: 'center',
        color: '#6A0DAD',
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div>
        <strong>Sous-Workflow</strong>
      </div>
      <div>{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(SubWorkflowNode);
