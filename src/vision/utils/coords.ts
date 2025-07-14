import { Percept } from '../types/Percept';

export function toBBox(p: Percept) {
  const size = 0.1;
  return new DOMRect(p.normX - size / 2, p.normY - size / 2, size, size);
}

export function toLandmarks(p: Percept) {
  return [{ x: p.normX, y: p.normY, z: p.z ?? 0 }];
}
