import { Node } from 'reactflow';

export type ForEachNodeData = {
  listExpression: string; // Expression to get the list to iterate over
  iterationVariable: string; // Name of the variable for each item in the loop
};

export const ForEachNode: Node<ForEachNodeData> = {
  id: 'for-each',
  type: 'for-each',
  data: {
    listExpression: '',
    iterationVariable: 'item',
  },
  position: { x: 0, y: 0 },
};
