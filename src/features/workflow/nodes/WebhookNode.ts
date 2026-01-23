import { Node } from 'reactflow';

export type WebhookNodeData = {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  statusCode?: number;
};

export const WebhookNode: Node<WebhookNodeData> = {
  id: 'webhook',
  type: 'webhook',
  data: {
    path: '/webhook',
    method: 'POST',
    responseBody: '{ "status": "success" }',
    responseHeaders: { 'Content-Type': 'application/json' },
    statusCode: 200,
  },
  position: { x: 0, y: 0 },
};
