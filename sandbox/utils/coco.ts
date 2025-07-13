import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

// Node 18+ has global fetch, otherwise fallback to node-fetch
declare const fetch: typeof globalThis.fetch;

export interface CocoAnnotation {
  id: number;
  image_id: number;
  category_id: number;
  bbox: [number, number, number, number]; // [x,y,w,h]
  area: number;
  iscrowd: 0 | 1;
}

export interface CocoImage {
  id: number;
  file_name: string;
  width: number;
  height: number;
}

export interface CocoData {
  images: CocoImage[];
  annotations: CocoAnnotation[];
  categories: { id: number; name: string }[];
}

const COCO_VAL_2017_URL =
  'http://images.cocodataset.org/zips/val2017.zip';
const COCO_ANN_2017_URL =
  'http://images.cocodataset.org/annotations/annotations_trainval2017.zip';

/**
 * Ensure that the COCO val2017 images (at least `sampleCount`) are present in destDir.
 * Downloads and extracts the ZIP if necessary.
 */
export async function ensureCocoImages(sampleCount: number, destDir: string) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const files = fs.readdirSync(destDir).filter((f) => f.endsWith('.jpg'));
  if (files.length >= sampleCount) {
    console.log(`[COCO] ${files.length} images already present – skipping download.`);
    return;
  }
  // Lazy import to avoid heavy deps if already downloaded
  console.log('[COCO] Downloading val2017.zip (may take a while)…');
  const AdmZip = (await import('adm-zip')).default;
  const res = await fetch(COCO_VAL_2017_URL);
  if (!res.ok || !res.body) throw new Error('Failed to download COCO images');
  const tmpZip = path.join(destDir, 'val2017.zip');
  await pipeline(res.body, fs.createWriteStream(tmpZip));

  const zip = new AdmZip(tmpZip);
  zip.extractAllTo(destDir, true);
  fs.unlinkSync(tmpZip);

  console.log('[COCO] Images extracted.');
}

/**
 * Ensure that annotations are downloaded and parsed.
 * Returns parsed COCO annotation object.
 */
export async function ensureCocoAnnotations(destDir: string): Promise<CocoData> {
  const annJson = path.join(destDir, 'instances_val2017.json');
  if (!fs.existsSync(annJson)) {
    console.log('[COCO] Downloading annotations…');
    const AdmZip = (await import('adm-zip')).default;
    const res = await fetch(COCO_ANN_2017_URL);
    if (!res.ok || !res.body) throw new Error('Failed to download COCO annotations');
    const tmpZip = path.join(destDir, 'ann.zip');
    await pipeline(res.body, fs.createWriteStream(tmpZip));
    const zip = new AdmZip(tmpZip);
    zip.extractAllTo(destDir, true);
    fs.unlinkSync(tmpZip);
  }
  const data: CocoData = JSON.parse(fs.readFileSync(annJson, 'utf-8'));
  return data;
}
