import { Node } from 'reactflow';

export type SetNodeData = {
  key: string;
  value: string; // Expression or literal value
};

export const SetNode: Node<SetNodeData> = {
  id: 'set',
  type: 'set',
  data: {
    key: '',
    value: '',
  },
  position: { x: 0, y: 0 },
};
