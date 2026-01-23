import * as tf from '@tensorflow/tfjs';
import { loadGraphModel } from '@tensorflow/tfjs-converter';

// COCO dataset class names
const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

let MODEL_URL = 'https://tfhub.dev/tensorflow/tfjs-model/yolov8n/1/default/1';
const INPUT_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.5;
const IOU_THRESHOLD = 0.45;

let model: tf.GraphModel | null = null;
let isModelLoading = false;

async function loadModel(url?: string) {
  if (url) {
    MODEL_URL = url;
    if (model) {
      model.dispose();
      model = null;
    }
  }

  if (isModelLoading || model) return;
  isModelLoading = true;

  try {
    await tf.setBackend('webgl');
    await tf.ready();
    console.log(`[VisionWorker] Loading model from: ${MODEL_URL}`);
    model = await loadGraphModel(MODEL_URL);
    
    // Warmup
    const dummyInput = tf.zeros([1, INPUT_SIZE, INPUT_SIZE, 3]);
    const warmupResult = model.execute(dummyInput);
    tf.dispose([dummyInput, warmupResult]);
    
    self.postMessage({ type: 'MODEL_LOADED', success: true });
  } catch (error) {
    self.postMessage({ type: 'MODEL_LOADED', success: false, error: String(error) });
  } finally {
    isModelLoading = false;
  }
}

function nms(boxes: number[][], scores: number[], iouThreshold: number): number[] {
  const selected: number[] = [];
  const indices = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);

  while (indices.length > 0) {
    const current = indices.shift()!;
    selected.push(current);
    indices.splice(0, indices.length, ...indices.filter(i => {
      const iou = calculateIoU(boxes[current], boxes[i]);
      return iou <= iouThreshold;
    }));
  }
  return selected;
}

function calculateIoU(box1: number[], box2: number[]): number {
  const [x1Min, y1Min, x1Max, y1Max] = box1;
  const [x2Min, y2Min, x2Max, y2Max] = box2;
  const intersectionArea = Math.max(0, Math.min(x1Max, x2Max) - Math.max(x1Min, x2Min)) *
    Math.max(0, Math.min(y1Max, y2Max) - Math.max(y1Min, y2Min));
  const unionArea = (x1Max - x1Min) * (y1Max - y1Min) + (x2Max - x2Min) * (y2Max - y2Min) - intersectionArea;
  return intersectionArea / unionArea;
}

async function processFrame(frameData: ImageData | ImageBitmap) {
  if (!model) return;

  try {
    const inputTensor = tf.browser.fromPixels(frameData);
    const resized = tf.image.resizeBilinear(inputTensor as tf.Tensor3D, [INPUT_SIZE, INPUT_SIZE]);
    const normalized = resized.div(255.0);
    const batched = normalized.expandDims(0);

    const predictions = model.execute(batched) as tf.Tensor;
    const predArray = await predictions.array() as number[][][];
    const detections = predArray[0];

    const boxes: number[][] = [];
    const scores: number[] = [];
    const classIds: number[] = [];

    for (const detection of detections) {
      const [x, y, w, h, confidence, ...classScores] = detection;
      if (confidence < CONFIDENCE_THRESHOLD) continue;

      const classId = classScores.indexOf(Math.max(...classScores));
      const finalScore = confidence * classScores[classId];

      if (finalScore < CONFIDENCE_THRESHOLD) continue;

      boxes.push([x - w/2, y - h/2, x + w/2, y + h/2]);
      scores.push(finalScore);
      classIds.push(classId);
    }

    const selectedIndices = nms(boxes, scores, IOU_THRESHOLD);
    const results = selectedIndices.map(i => ({
      box: boxes[i],
      class: COCO_CLASSES[classIds[i]] || `class_${classIds[i]}`,
      score: scores[i],
    }));

    tf.dispose([inputTensor, resized, normalized, batched, predictions]);

    self.postMessage({
      modality: 'vision',
      payload: {
        type: 'object',
        boxes: results.map(r => r.box),
        classes: results.map(r => r.class),
        scores: results.map(r => r.score),
      },
      confidence: results.length > 0 ? Math.max(...results.map(r => r.score)) : 0,
      ts: Date.now(),
    });

  } catch (error) {
    self.postMessage({ type: 'ERROR', error: String(error) });
  }
}

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;
  if (type === 'LOAD_MODEL') await loadModel(payload?.modelUrl);
  if (type === 'PROCESS_FRAME') await processFrame(payload);
};
