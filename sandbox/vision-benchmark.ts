#!/usr/bin/env ts-node

/**
 * Vision Benchmark Script – LOT 1 étape 1
 *
 * Usage:
 *   ts-node sandbox/vision-benchmark.ts --samples 50 --out docs/vision/benchmark_v1.md
 *
 * • Télécharge COCO val2017 (images + annotations) au besoin (premiers N échantillons)
 * • Exécute des inférences sur EfficientDet-Lite et YOLOv8-n (tfjs) via tfjs-node
 * • Mesure FPS, latence moyenne, RAM et mAP@0.5 approximatif
 * • Génère un JSON brut + un rapport Markdown prêt à pousser dans docs/
 *
 * Remarque : l’objectif est d’obtenir des chiffres reproductibles hors navigateur.
 * Les décodages post-process sont simplifiés ; les valeurs mAP doivent être prises
 * comme indicatives.
 */

import * as tf from '@tensorflow/tfjs-node';
import { loadGraphModel } from '@tensorflow/tfjs-converter';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { ensureCocoImages, ensureCocoAnnotations, CocoData } from './utils/coco.ts';
import { computeMAP, Prediction, GroundTruth } from './utils/metrics.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { samples, out } = yargs(hideBin(process.argv))
  .option('samples', {
    alias: 'n',
    type: 'number',
    default: 50,
    describe: 'Nombre d’images COCO à utiliser',
  })
  .option('out', {
    alias: 'o',
    type: 'string',
    default: 'docs/vision/benchmark_v1.md',
    describe: 'Chemin du rapport markdown généré',
  })
  .strict()
  .parseSync();

// Model URLs (graph models TF-JS)
const MODELS: Record<
  string,
  { url: string; decode: (raw: tf.Tensor | tf.Tensor[] | tf.NamedTensorMap) => Prediction[] }
> = {
  'EfficientDet-Lite': {
    url: 'https://tfhub.dev/tensorflow/efficientdet/lite0/detection/1?tfjs-format=graph_model',
    decode: efficientdetDecode,
  },
  'YOLOv8-n': {
    url: 'https://storage.googleapis.com/ultralytics-hub-models/v8/8.1/yolov8n_web_model/model.json',
    decode: yoloDecode,
  },
};

const DATA_DIR = path.join(__dirname, '.coco');

async function loadImageTensor(fp: string): Promise<tf.Tensor3D> {
  const buf = fs.readFileSync(fp);
  return tf.node.decodeImage(buf, 3) as tf.Tensor3D;
}

async function runBenchmark(modelName: string, coco: CocoData, imgPaths: string[]) {
  console.log(`\n▶ Running ${modelName} …`);
  const modelUrl = MODELS[modelName].url;
  const decodePred = MODELS[modelName].decode;

  const model = await loadGraphModel(modelUrl);

  // warm-up on first image
  const warmImg = await loadImageTensor(imgPaths[0]);
  await model.executeAsync(warmImg.expandDims(0));
  warmImg.dispose();

  let totalMs = 0;
  const allPreds: Record<number, Prediction[]> = {};
  const allGT: Record<number, GroundTruth[]> = {};

  for (let i = 0; i < imgPaths.length; i++) {
    const gtImg = coco.images[i];
    const ann = coco.annotations.filter(a => a.image_id === gtImg.id);

    allGT[gtImg.id] = ann.map(a => ({
      x: a.bbox[0],
      y: a.bbox[1],
      w: a.bbox[2],
      h: a.bbox[3],
      categoryId: a.category_id,
    }));

    const imgTensor = await loadImageTensor(imgPaths[i]);
    const t0 = tf.util.now();
    const raw = await model.executeAsync(imgTensor.expandDims(0));
    const t1 = tf.util.now();
    totalMs += t1 - t0;

    const preds = decodePred(raw);
    allPreds[gtImg.id] = preds;

    tf.dispose(imgTensor);
    tf.dispose(raw);
  }

  const avgMs = totalMs / imgPaths.length;
  const fps = 1000 / avgMs;
  const mAP = computeMAP(allPreds, allGT, 0.5);
  const ramMb = process.memoryUsage().rss / 1024 / 1024;

  return { fps, avgMs, mAP, ramMb };
}

function efficientdetDecode(raw: tf.Tensor | tf.Tensor[] | tf.NamedTensorMap): Prediction[] {
  // Output signature : [boxes, scores, classes, num]
  let boxes: tf.Tensor2D, scores: tf.Tensor2D, classes: tf.Tensor2D;
  if (Array.isArray(raw)) {
    [boxes, scores, classes] = raw as tf.Tensor2D[];
  } else if (raw instanceof tf.Tensor) {
    return [];
  } else {
    boxes = raw['detection_boxes'] as tf.Tensor2D;
    scores = raw['detection_scores'] as tf.Tensor2D;
    classes = raw['detection_classes'] as tf.Tensor2D;
  }
  const boxesArr = boxes.arraySync();
  const scoresArr = scores.arraySync()[0];
  const classesArr = classes.arraySync()[0];
  const preds: Prediction[] = [];
  for (let i = 0; i < scoresArr.length; i++) {
    if (scoresArr[i] < 0.3) continue;
    const [ymin, xmin, ymax, xmax] = boxesArr[0][i];
    preds.push({
      x: xmin * 640,
      y: ymin * 640,
      w: (xmax - xmin) * 640,
      h: (ymax - ymin) * 640,
      score: scoresArr[i],
      categoryId: classesArr[i],
    });
  }
  return preds;
}

function yoloDecode(raw: tf.Tensor | tf.Tensor[] | tf.NamedTensorMap): Prediction[] {
  // Expect raw tensor shape [1,N,85] (x,y,w,h,obj,80 classes)
  let output: tf.Tensor;
  if (Array.isArray(raw)) {
    output = raw[0] as tf.Tensor;
  } else if (raw instanceof tf.Tensor) {
    output = raw;
  } else {
    output = raw[Object.keys(raw)[0]] as tf.Tensor;
  }
  const arr = output.squeeze().arraySync() as number[][];
  const preds: Prediction[] = [];
  arr.forEach(v => {
    const [x, y, w, h, obj, ...cls] = v;
    const score = obj * Math.max(...cls);
    if (score < 0.3) return;
    const classId = cls.indexOf(Math.max(...cls));
    preds.push({
      x: (x - w / 2) * 640,
      y: (y - h / 2) * 640,
      w: w * 640,
      h: h * 640,
      score,
      categoryId: classId,
    });
  });
  return preds;
}

async function main() {
  await tf.ready();
  console.log(`TensorFlow backend: ${tf.getBackend()}`);

  await ensureCocoImages(samples, DATA_DIR);
  const coco = await ensureCocoAnnotations(DATA_DIR);
  const imgPaths = coco.images.slice(0, samples).map(img => path.join(DATA_DIR, 'val2017', img.file_name));

  const results: Record<string, any> = {};
  for (const m of Object.keys(MODELS)) {
    results[m] = await runBenchmark(m, coco, imgPaths);
  }

  const resultsPath = path.join(__dirname, 'results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({ date: new Date().toISOString(), samples, results }, null, 2));
  console.log(`\n✔ Résultats écrits dans ${resultsPath}`);

  generateMarkdown(out as string, results);
}

function generateMarkdown(mdPath: string, res: Record<string, any>) {
  const header = `# Rapport de Benchmark Vision – v1\n\n> ${samples} images COCO val2017 | Backend TF-JS : ${tf.getBackend()} | ${new Date().toLocaleString()}\n\n`;
  let table = '| Modèle | FPS | Latence ms | RAM MB | mAP@0.5 |\n|--------|-----|-----------|--------|---------|\n';
  for (const [k, v] of Object.entries(res)) {
    table += `| ${k} | ${v.fps.toFixed(1)} | ${v.avgMs.toFixed(1)} | ${v.ramMb.toFixed(1)} | ${(v.mAP * 100).toFixed(1)}% |\n`;
  }
  const concl = `\n**Modèle recommandé** : ${res['YOLOv8-n'].fps > res['EfficientDet-Lite'].fps ? 'YOLOv8-n' : 'EfficientDet-Lite'} (meilleur compromis vitesse/précision).`;

  fs.mkdirSync(path.dirname(mdPath), { recursive: true });
  fs.writeFileSync(mdPath, header + table + concl);
  console.log(`✔ Rapport Markdown mis à jour : ${mdPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
