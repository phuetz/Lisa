import { Node } from 'reactflow';

export type ConditionNodeData = {
  condition: string; // JavaScript expression that evaluates to true or false
};

export const ConditionNode: Node<ConditionNodeData> = {
  id: 'condition',
  type: 'condition',
  data: {
    condition: 'true',
  },
  position: { x: 0, y: 0 },
};
