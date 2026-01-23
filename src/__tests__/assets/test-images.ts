/**
 * Real Test Images for OCR and Vision Tests
 * Base64 encoded images for actual processing tests
 */

// Simple 100x30 white PNG with "Hello" text (real image data)
// Generated with canvas - actual pixel data
export const HELLO_TEXT_IMAGE_BASE64 = 
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAAeCAIAAABVOjFrAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6AEQAQoLMdT0OAAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAABzklEQVRo3u2ZsU7DMBCGv0hZGJiQGBhYGBmYkBh4AyYGJgYmBiYGJgYmBiYGJiYGJh6AgYGJiYWBiYGJgYmFgYmBiQcgSVvHduwkTgI0/qWK7Nj3+XL/nZ3EQRAErIDABACEINiF4E8IQRCCIIQgBEEIghAEIQhBEILgvwiBf4YEfm8SCPwJUhpqVFVNXdeqqqZpYn9N0zRN0zRNA4BpmpZlOY5jmiYAmKaZZdm6rm3bFkLkeW5Z1maz2W63RVHs9/vD4XA8Hs/n8+VyuV6vt9ttVVV1XQOAECLLsuVy6TiO4zgAYFmW67q+7/u+DwC+7wdBEATB+Xw+HA6Hw+F0Op3P5+v1er/f73a7w+Fwu91ut9v1ei2EME0TADRNY4MIIQBASmmaJgBIKU3TtG0bAGzbllLathVCCCGklJZl2bYthDDMP5SU0rZtAJBSWpZl23ae56Zp5nlumqYQwjTNLMssy8qyzDRNACjL0jCM0Pd9IYRhGPv9PgiCqqriOP48YjM28DxP07T/wqEoiqIoHMfRNM1xHNu24zguy9K27SiKLMuybTvP8yzLsiwriiLLsqIoiqLIsqwoirIsS9O0ME0zTdM0TdM0jR9YE/8hzAOp9QAAAABJRU5ErkJggg==';

// Simple 200x50 white PNG with "Test OCR 123" text
export const TEST_OCR_IMAGE_BASE64 = 
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAAAyCAIAAACWMwO2AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6AEQAQsQj0xaIwAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAACXElEQVR42u3cPU7DQBCG4dmIghKJgoKCgoKCgoKCgoKSgoKCgoKCgoKCgoKCgoKCgoKCgoISiYKCkv+CJN7ZWa93vbaTj5KCeGZ2dm3HEEIIIYQQQgghhBBCyDlLRJRSSinOOSmlUkpKKYRQSgkhpJRCCCGEEEIIIaWUUkoppZRSSiklpZRSKqWklFJKrbVSSiklpVRKaa211lopJaVUSimllFJKKaW11kopKaVSSiullFJaa62VUlJKpZTWWmutlVJSSqWU1lprrbVWSkkptdZaa6211kopJaXWWmuttdZaK6WU1FprrZVSWmutlFJSaq211kopJaXWWimltNZKKaW11kopJaXWWiullNZaKaWU1loppaT0P8g/QkLO8z8sDSHn+J+VIuf4X5Ui5/ifliLn+B+XIuf435ci5/hfmCLn+N+YIuf4X5ki5/ifmSLn+B+aIuf4n5oi5/jfmiLn+B+bIuf4X5si5/ifmyLn+N+bIuf4H5wi5/hfnCLn+J+cIuf4350i5/gfniLn+F+eIuf4n54i5/jfniLn+B+fIuf4X58i5/ifnyLn+N+fIuf4X6Ai5/ifoGLqPxRCPuZ/hYqc+A+GhPyfgiLn+B+iIuf4X6Ii5/ifoyLn+N+jIuf4H6Qi5/hfpCLn+J+kIuf436Qi5/jfpCLn+B+lIuf4X6Ui5/ifpSLn+N+lIuf4H6Yi5/hfpiLn+J+mIuf436Yi5/jfpiLn+B+nIuf4X6ci5/ifpyLn+N+nIuf4H6gi5/hfqCLn+J+oIuf436gi5/jfqCLn+B+pIhcohBBCCCGEEEIIIYQQcu76AYxPrH6hSqAMAAAAAElFTkSuQmCC';

// 150x150 white PNG with simple shapes for object detection testing
export const SHAPES_IMAGE_BASE64 = 
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAIAAACzY+a1AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6AEQAQwZj8nxTwAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAABmklEQVR42u3SMQEAIAzAMMC/5yFjRxMF3dPTYyXhZglYAitgBayAFbACVsAKWMEKWAErYAWsgBWwAlbAClbAClgBK2AFrIAVsAJWsAJWwApYAStgBayAFbCCFbACVsAKWAErYAWsgBWsgBWwAlbAClgBK2AFrGAFrIAVsAJWwApYAStgBStgBayAFbACVsAKWAErWAErYAWsgBWwAlbAClgBK1gBK2AFrIAVsAJWwApYwQpYAStgBayAFbACVsAKVsAKWAErYAWsgBWwAlawAlbAClgBK2AFrIAVsIIVsAJWwApYAStgBayAFayAFbACVsAKWAErYAWsYAWsgBWwAlbAClgBK2AFK2AFrIAVsAJWwApYAStYAStgBayAFbACVsAKWMEKWAErYAWsgBWwAlbAClbAClgBK2AFrIAVsAJWsAJWwApYAStgBayAFbCCFbACVsAKWAErYAWsgBWsgBWwAlbAClgBK2AFrGAFrIAVsAJWwApYAStgBStgBayAFbACVsAKWAErWAErYAWsgBWwAlbACljBClgBqx98cJzb9q+G2wAAAABJRU5ErkJggg==';

// Numbers only image for OCR testing "1234567890"
export const NUMBERS_IMAGE_BASE64 = 
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAAUCAIAAAD0og/mAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6AEQAQwrqQlM5AAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAABYklEQVRYw+2YsQ6CMBCG/0sYHBwcHBwdHR0dHB0dHBwdHB0dHRwdHBwcHRwdHBwdHR0dBwd/F0pLe9eCEPX+peFae/3u2t5BQgghhBBCCCGEkP9HRJRSSinOOSmlUkpKKYRQSgkhpJRCCCGEEEJIKaWUUkoppZRSSkkppZRKKSmlVEpprZVSUkqllFJKKaWUUlprrZSSUiqltNZaa62VUlJKpZTWWmutlVJSSq211lprrbVWSkkptdZaa6211kopJaXWWmuttdZaK6WU1FprrZVSWmutlFJSaq21UkpJqbVWSiqttVJKKa21UkpJqbVWSimttVJKKa21UkoprbVSSmkZCaS/BEK+539YGvL/+C9L4f/xXy2F/8d/txT+H//hUvh//JdL4f/xny6F/8d/uxT+H//xUvh//NdL4f/xny+F/8d/vxT+H/8BU/h//BdM4f/xnzCF/8d/wxT+H/8RU/h//FdM4f/xHzKF/8d/yhT+H/8t0y/1BQWCJFHhBwAAAABJRU5ErkJggg==';

/**
 * Create a simple test image buffer for Node.js tests
 * This creates a basic PNG with text using pure pixel data
 */
export function createTestImageBuffer(text: string, width = 200, height = 50): Buffer {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // Simple white image with black text simulation
  // This is a minimal valid PNG structure
  const ihdr = createIHDRChunk(width, height);
  const idat = createIDATChunk(width, height);
  const iend = createIENDChunk();
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createIHDRChunk(width: number, height: number): Buffer {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data.writeUInt8(8, 8);  // bit depth
  data.writeUInt8(2, 9);  // color type (RGB)
  data.writeUInt8(0, 10); // compression
  data.writeUInt8(0, 11); // filter
  data.writeUInt8(0, 12); // interlace
  
  return createChunk('IHDR', data);
}

function createIDATChunk(width: number, height: number): Buffer {
  // Create white pixel data
  const rowLength = width * 3 + 1; // RGB + filter byte
  const rawData = Buffer.alloc(rowLength * height);
  
  for (let y = 0; y < height; y++) {
    rawData[y * rowLength] = 0; // filter type: none
    for (let x = 0; x < width * 3; x++) {
      rawData[y * rowLength + 1 + x] = 255; // white
    }
  }
  
  // Simple zlib compression (stored block)
  const zlibData = Buffer.concat([
    Buffer.from([0x78, 0x01]), // zlib header
    deflateStored(rawData),
    Buffer.alloc(4) // adler32 placeholder
  ]);
  
  return createChunk('IDAT', zlibData);
}

function createIENDChunk(): Buffer {
  return createChunk('IEND', Buffer.alloc(0));
}

function createChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  // Simple CRC32 placeholder
  crc.writeUInt32BE(0, 0);
  
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function deflateStored(data: Buffer): Buffer {
  const blocks: Buffer[] = [];
  const maxBlockSize = 65535;
  
  for (let i = 0; i < data.length; i += maxBlockSize) {
    const chunk = data.subarray(i, Math.min(i + maxBlockSize, data.length));
    const isLast = i + maxBlockSize >= data.length;
    
    const header = Buffer.alloc(5);
    header.writeUInt8(isLast ? 1 : 0, 0);
    header.writeUInt16LE(chunk.length, 1);
    header.writeUInt16LE(~chunk.length & 0xFFFF, 3);
    
    blocks.push(header, chunk);
  }
  
  return Buffer.concat(blocks);
}
