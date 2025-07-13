import { Node } from 'reactflow';

export type HttpRequestNodeData = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: string; // Changed to string
  timeout?: number; // Added timeout
};

export const HttpRequestNode: Node<HttpRequestNodeData> = {
  id: 'http-request',
  type: 'http-request',
  data: {
    method: 'GET',
    url: '',
    headers: {},
    body: '',
    timeout: 5000, // Default timeout
  },
  position: { x: 0, y: 0 },
};
