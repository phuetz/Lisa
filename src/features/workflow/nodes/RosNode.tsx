
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { RosAgentParams } from '../../../agents/RosAgent';

const RosNode: React.FC<NodeProps<RosAgentParams>> = ({ data }) => {
  return (
    <div
      style={{
        padding: 10,
        border: '1px solid #ddd',
        borderRadius: 5,
        background: '#f9f9f9',
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div>
        <strong>ROS Topic</strong>
      </div>
      <div>{data.mode.toUpperCase()}</div>
      <div>{data.topic}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(RosNode);
