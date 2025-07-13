/**
 * @file src/types/index.ts
 * 
 * Ce fichier contient les types globaux de l'application.
 */

export type Percept<V> = {
  modality: 'vision' | 'hearing';
  payload: V;
  confidence: number;
  ts: number;
};
