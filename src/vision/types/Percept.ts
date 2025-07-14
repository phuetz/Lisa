export interface Percept {
  type: 'face' | 'object' | 'text' | 'pose';
  source: string;
  ts: number;
  normX: number;
  normY: number;
  z?: number;
  orientation?: number;
  space: 'image' | 'world';
  payload: unknown;
}
