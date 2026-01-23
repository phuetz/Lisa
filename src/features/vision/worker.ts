// src/workers/visionWorker.ts
import * as tf from '@tensorflow/tfjs';
import { loadGraphModel } from '@tensorflow/tfjs-converter';

// COCO dataset class names (80 classes)
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

// Model configuration
let MODEL_URL = 'https://storage.googleapis.com/ultralytics-hub-models/v8/8.1/yolov8n_web_model/model.json';
const INPUT_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.5;
const IOU_THRESHOLD = 0.45;

let model: tf.GraphModel | null = null;
let isModelLoading = false;

// Function to load the YOLOv8-n model
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
    
    // --- TARGET: SDK Standard Format ---
    const sdkObjects = selectedIndices.map(i => ({
      label: COCO_CLASSES[classIds[i]] || `class_${classIds[i]}`,
      confidence: scores[i],
      bbox: [
        boxes[i][0] / INPUT_SIZE, // Normalized x1
        boxes[i][1] / INPUT_SIZE, // Normalized y1
        boxes[i][2] / INPUT_SIZE, // Normalized x2
        boxes[i][3] / INPUT_SIZE  // Normalized y2
      ] as [number, number, number, number]
    }));

    // --- TARGET: Legacy VisionObjectPayload Format for UI Compatibility ---
    const boxesPayload = sdkObjects.map(o => o.bbox);
    const classesPayload = sdkObjects.map(o => o.label);
    const scoresPayload = sdkObjects.map(o => o.confidence);

    const legacyPayload = {
        type: 'object',
        boxes: boxesPayload,
        classes: classesPayload,
        scores: scoresPayload
    };

    tf.dispose([inputTensor, resized, normalized, batched, predictions]);

    self.postMessage({
      modality: 'vision',
      payload: legacyPayload,
      confidence: sdkObjects.length > 0 ? Math.max(...sdkObjects.map(o => o.confidence)) : 0,
      timestamp: Date.now()
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
