export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Prediction extends Box {
  score: number;
  categoryId: number;
}

export interface GroundTruth extends Box {
  categoryId: number;
}

export function iou(a: Box, b: Box): number {
  const xA = Math.max(a.x, b.x);
  const yA = Math.max(a.y, b.y);
  const xB = Math.min(a.x + a.w, b.x + b.w);
  const yB = Math.min(a.y + a.h, b.y + b.h);
  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  if (interArea === 0) return 0;
  const boxAArea = a.w * a.h;
  const boxBArea = b.w * b.h;
  return interArea / (boxAArea + boxBArea - interArea);
}

/**
 * Very simplified mAP@0.5 implementation.
 * For each class, sorts predictions by score and matches with highest IoU GT (> threshold) not yet matched.
 */
export function computeMAP(
  allPreds: Record<number, Prediction[]>,
  allGT: Record<number, GroundTruth[]>,
  iouThreshold = 0.5
): number {
  const aps: number[] = [];

  const classIds = new Set<number>();
  Object.values(allGT).forEach(arr => arr.forEach(g => classIds.add(g.categoryId)));
  Object.values(allPreds).forEach(arr => arr.forEach(p => classIds.add(p.categoryId)));

  classIds.forEach(cid => {
    const preds: Prediction[] = [];
    const gts: GroundTruth[] = [];
    for (const imgId of Object.keys(allPreds)) {
      preds.push(...(allPreds[+imgId] || []).filter(p => p.categoryId === cid));
      gts.push(...(allGT[+imgId] || []).filter(g => g.categoryId === cid));
    }
    preds.sort((a, b) => b.score - a.score);
    const matched = new Set<number>(); // indices of GT used
    let tp = 0;
    let fp = 0;
    preds.forEach(p => {
      let bestIoU = 0;
      let bestIdx = -1;
      gts.forEach((g, idx) => {
        if (matched.has(idx)) return;
        const i = iou(p, g);
        if (i > bestIoU) {
          bestIoU = i;
          bestIdx = idx;
        }
      });
      if (bestIoU >= iouThreshold && bestIdx !== -1) {
        matched.add(bestIdx);
        tp++;
      } else {
        fp++;
      }
    });
    const fn = gts.length - matched.size;
    const precision = tp / Math.max(tp + fp, 1);
    const recall = tp / Math.max(tp + fn, 1);
    const ap = precision * recall; // very rough; proper AP integrates precision-recall curve
    aps.push(ap);
  });

  const mAP = aps.reduce((a, b) => a + b, 0) / Math.max(aps.length, 1);
  return mAP;
}
