import { browser } from '$app/environment';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

let gifuctPromise;
async function loadGifuct() {
  if (!gifuctPromise) {
    gifuctPromise = import('gifuct-js').then((mod) => ({
      parseGIF: mod.parseGIF || mod.default?.parseGIF,
      decompressFrames: mod.decompressFrames || mod.default?.decompressFrames,
    }));
  }
  return gifuctPromise;
}

function extractLoopCount(parsedGif) {
  const loopFrame = parsedGif?.frames?.find((frame) => {
    const id = frame?.application?.id || '';
    return typeof id === 'string' && id.toUpperCase().includes('NETSCAPE');
  });
  if (!loopFrame) return 0;
  const bytes = loopFrame.application?.blocks;
  if (!bytes || bytes.length < 3) return 0;
  if (bytes[0] !== 1) return 0;
  return bytes[1] + (bytes[2] << 8);
}

function createFrameBuffer(width, height) {
  return new Uint8ClampedArray(width * height * 4);
}

function cloneBuffer(buffer) {
  return new Uint8ClampedArray(buffer);
}

function imageDataToDataUrl(imageData) {
  if (!browser) return '';
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function createCanvas(width, height) {
  if (!browser) {
    return { canvas: null, ctx: null };
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    return { canvas, ctx: canvas.getContext('2d') };
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

function cloneImageDataObject(imageData) {
  if (!imageData) return null;
  if (typeof ImageData === 'undefined') return imageData;
  return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
}

function getBackgroundColor(parsedGif) {
  const bgIndex = parsedGif?.lsd?.backgroundColorIndex;
  const colorTable = parsedGif?.gct;
  if (typeof bgIndex === 'number' && colorTable && colorTable[bgIndex]) {
    const [r, g, b] = colorTable[bgIndex];
    return { r, g, b, a: 255 };
  }
  return null;
}

function fillRectBuffer(buffer, dims, canvasWidth, color) {
  const { left, top, width, height } = dims;
  const fillColor = color || { r: 0, g: 0, b: 0, a: 0 };
  for (let row = 0; row < height; row += 1) {
    const start = ((top + row) * canvasWidth + left) * 4;
    for (let col = 0; col < width; col += 1) {
      const idx = start + col * 4;
      buffer[idx] = fillColor.r;
      buffer[idx + 1] = fillColor.g;
      buffer[idx + 2] = fillColor.b;
      buffer[idx + 3] = fillColor.a;
    }
  }
}

function drawPatch(buffer, patch, dims, canvasWidth) {
  const { left, top, width, height } = dims;
  const bytesPerRow = width * 4;
  for (let row = 0; row < height; row += 1) {
    const patchStart = row * bytesPerRow;
    const screenStart = ((top + row) * canvasWidth + left) * 4;
    buffer.set(patch.subarray(patchStart, patchStart + bytesPerRow), screenStart);
  }
}

export async function decodeGifFile(file) {
  const { parseGIF, decompressFrames } = await loadGifuct();
  const buffer = await file.arrayBuffer();
  const parsed = parseGIF(buffer);
  const framesRaw = decompressFrames(parsed, true);
  const width = parsed?.lsd?.width ?? 0;
  const height = parsed?.lsd?.height ?? 0;
  const loopCount = extractLoopCount(parsed);
  const backgroundColor = null; // treat background as transparent to avoid fake colors
  if (!browser) {
    return { width, height, loopCount, frames: [] };
  }
  let frameBuffer = createFrameBuffer(width, height);
  const frames = [];
  framesRaw.forEach((frame, index) => {
    const before = cloneBuffer(frameBuffer);
    drawPatch(frameBuffer, frame.patch, frame.dims, width);
    const snapshotData = cloneBuffer(frameBuffer);
    const imageData =
      typeof ImageData !== 'undefined' ? new ImageData(snapshotData, width, height) : { data: snapshotData, width, height };
    const previewUrl = imageDataToDataUrl(imageData);
    frames.push({
      id: `${file.name}-${index}`,
      delay: frame.delay ?? 100,
      disposalType: frame.disposalType,
      imageData,
      previewUrl,
    });
    if (frame.disposalType === 2) {
      fillRectBuffer(frameBuffer, frame.dims, width, backgroundColor);
    } else if (frame.disposalType === 3) {
      frameBuffer.set(before);
    }
  });
  return { width, height, loopCount, frames };
}

export function scaleImageData(imageData, targetWidth, targetHeight) {
  if (!browser) return imageData;
  const { canvas, ctx } = createCanvas(targetWidth, targetHeight);
  if (!canvas || !ctx) return imageData;
  const temp = createCanvas(imageData.width, imageData.height);
  if (!temp.canvas || !temp.ctx) return imageData;
  temp.ctx.putImageData(imageData, 0, 0);
  ctx.drawImage(temp.canvas, 0, 0, targetWidth, targetHeight);
  return ctx.getImageData(0, 0, targetWidth, targetHeight);
}

export function cropImageData(imageData, crop) {
  if (!browser) return imageData;
  const { x, y, width, height } = crop;
  const { canvas, ctx } = createCanvas(width, height);
  if (!canvas || !ctx) return imageData;
  const temp = createCanvas(imageData.width, imageData.height);
  if (!temp.canvas || !temp.ctx) return imageData;
  temp.ctx.putImageData(imageData, 0, 0);
  ctx.drawImage(temp.canvas, x, y, width, height, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export async function encodeGif(frames, options = {}) {
  const {
    width,
    height,
    delay = 100,
    loop = 0,
    paletteSize = 256,
  } = options;
  const encoder = GIFEncoder();
  if (typeof encoder.setLoop === 'function') {
    encoder.setLoop(loop);
  }
  frames.forEach((frame) => {
    const rgba = frame.imageData?.data ?? frame.data;
    const palette = quantize(rgba, Math.min(256, paletteSize));
    const index = applyPalette(rgba, palette);
    encoder.writeFrame(index, width, height, {
      palette,
      delay: frame.delay ?? delay,
      disposal: frame.disposalType ?? 2,
    });
  });
  encoder.finish();
  const buffer = encoder.bytesView();
  return new Blob([buffer], { type: 'image/gif' });
}

export function applyScaleToFrames(frames, width, height) {
  return frames.map((frame) => {
    const imageData = scaleImageData(frame.imageData, width, height);
    return {
      ...frame,
      imageData,
      previewUrl: imageDataToDataUrl(imageData),
    };
  });
}

export function applyCropToFrames(frames, crop) {
  return frames.map((frame) => {
    const imageData = cropImageData(frame.imageData, crop);
    return {
      ...frame,
      imageData,
      previewUrl: imageDataToDataUrl(imageData),
    };
  });
}

export function estimateFps(frames) {
  if (!frames?.length) return 0;
  const totalDelay = frames.reduce((sum, frame) => sum + Math.max(1, frame.delay || 0), 0);
  if (!totalDelay) return 0;
  const avgDelay = totalDelay / frames.length;
  if (!avgDelay) return 0;
  return 1000 / avgDelay;
}

function cloneFrames(frames) {
  return frames.map((frame) => ({
    ...frame,
    delay: frame.delay,
    imageData: cloneImageDataObject(frame.imageData),
    previewUrl: frame.previewUrl,
  }));
}

export function reduceFramesToFps(frames, targetFps) {
  if (!frames?.length || !targetFps) return frames;
  const currentFps = estimateFps(frames);
  if (!currentFps || targetFps >= currentFps) return frames;
  const targetDelay = Math.max(10, Math.round(1000 / targetFps));
  const result = [];
  let accumulator = 0;
  frames.forEach((frame) => {
    accumulator += frame.delay || 0;
    while (accumulator >= targetDelay) {
      const cloned = {
        ...frame,
        imageData: cloneImageDataObject(frame.imageData),
        previewUrl: frame.previewUrl,
        delay: targetDelay,
      };
      result.push(cloned);
      accumulator -= targetDelay;
    }
  });
  if (!result.length) return frames;
  if (accumulator > 0) {
    result.push({
      ...frames[frames.length - 1],
      imageData: cloneImageDataObject(frames[frames.length - 1].imageData),
      previewUrl: frames[frames.length - 1].previewUrl,
      delay: targetDelay,
    });
    result[result.length - 1].delay = targetDelay;
  }
  if (result.length && result[result.length - 1].delay <= 0) {
    result[result.length - 1].delay = targetDelay;
  }
  return result;
}

export function mergeDuplicateFrames(frames) {
  if (!frames?.length) return frames;
  const result = [];
  let lastFrame = null;
  frames.forEach((frame) => {
    if (lastFrame && areFramesEqual(lastFrame, frame)) {
      lastFrame.delay += frame.delay || 0;
    } else {
      const cloned = {
        ...frame,
        imageData: cloneImageDataObject(frame.imageData),
        previewUrl: frame.previewUrl ?? imageDataToDataUrl(frame.imageData),
      };
      result.push(cloned);
      lastFrame = cloned;
    }
  });
  return result;
}

function areFramesEqual(a, b) {
  if (!a || !b || !a.imageData || !b.imageData) return false;
  if (a.imageData.width !== b.imageData.width || a.imageData.height !== b.imageData.height) return false;
  const dataA = a.imageData.data;
  const dataB = b.imageData.data;
  if (!dataA || !dataB || dataA.length !== dataB.length) return false;
  for (let i = 0; i < dataA.length; i += 4) {
    if (
      dataA[i] !== dataB[i] ||
      dataA[i + 1] !== dataB[i + 1] ||
      dataA[i + 2] !== dataB[i + 2] ||
      dataA[i + 3] !== dataB[i + 3]
    ) {
      return false;
    }
  }
  return true;
}

function collectPaletteSample(frames, maxSamples = 10) {
  if (!frames?.length) return null;
  const sampleFrames = Math.min(frames.length, maxSamples);
  const step = Math.max(1, Math.floor(frames.length / sampleFrames));
  const sliceLength = frames[0].imageData?.data?.length || 0;
  if (!sliceLength) return null;
  const sample = new Uint8Array(sampleFrames * sliceLength);
  let offset = 0;
  for (let i = 0; i < frames.length && offset < sample.length; i += step) {
    const data = frames[i].imageData?.data;
    if (!data) continue;
    sample.set(data, offset);
    offset += data.length;
  }
  return sample.slice(0, offset);
}

function applyDitherNoise(data, strength = 6) {
  if (!strength) return;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() * 2 - 1) * strength;
    data[i] = clampChannel(data[i] + noise);
    data[i + 1] = clampChannel(data[i + 1] + noise);
    data[i + 2] = clampChannel(data[i + 2] + noise);
  }
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function paintFromPalette(indexes, palette, width, height) {
  const output = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < indexes.length; i += 1) {
    const paletteEntry = palette[indexes[i]] || [0, 0, 0, 255];
    const base = i * 4;
    output[base] = paletteEntry[0];
    output[base + 1] = paletteEntry[1];
    output[base + 2] = paletteEntry[2];
    output[base + 3] = paletteEntry[3] ?? 255;
  }
  return output;
}

export async function remapPalette(frames, paletteSize = 256, { dither = false } = {}) {
  if (!browser || !frames?.length) return frames;
  const maxColors = Math.min(256, Math.max(2, paletteSize));
  if (maxColors === 256 && !dither) {
    return frames.map((frame, index) => ({
      ...frame,
      previewUrl: frame.previewUrl ?? imageDataToDataUrl(frame.imageData),
      id: `${frame.id || 'frame'}-palette-${index}`,
    }));
  }
  const sample = collectPaletteSample(frames);
  if (!sample) return frames;
  const palette = quantize(sample, maxColors);
  return frames.map((frame, index) => {
    const cloned = cloneImageDataObject(frame.imageData);
    if (!cloned) return frame;
    const rgba = new Uint8Array(cloned.data);
    if (dither) applyDitherNoise(rgba);
    const indexes = applyPalette(rgba, palette);
    const quantizedData = paintFromPalette(indexes, palette, cloned.width, cloned.height);
    const imageData = new ImageData(quantizedData, cloned.width, cloned.height);
    return {
      ...frame,
      imageData,
      previewUrl: imageDataToDataUrl(imageData),
      id: `${frame.id || 'frame'}-palette-${index}`,
    };
  });
}

export function estimateGifBytes(frames, width, height, paletteSize = 256) {
  if (!frames?.length || !width || !height) return 0;
  const pixelsPerFrame = width * height;
  const bitsPerPixel = Math.max(2, Math.ceil(Math.log2(Math.max(2, paletteSize))));
  const dataBytesPerFrame = Math.ceil((pixelsPerFrame * bitsPerPixel) / 8);
  const frameOverhead = 32; // rough header+GCE bytes
  return frames.reduce((sum) => sum + dataBytesPerFrame + frameOverhead, 0);
}

export async function buildCompressedFrames(frames, width, height, options = {}) {
  if (!browser || !frames?.length) {
    return {
      frames,
      width,
      height,
      fps: estimateFps(frames),
      paletteSize: options.paletteSize ?? 256,
      estimatedBytes: 0,
    };
  }
  const workingOptions = {
    scalePercent: options.scalePercent ?? 100,
    targetFps: options.targetFps,
    paletteSize: options.paletteSize ?? 256,
    dither: Boolean(options.dither),
    optimizeBackground: Boolean(options.optimizeBackground),
  };

  let workingFrames = cloneFrames(frames);
  let currentWidth = width;
  let currentHeight = height;

  if (workingOptions.scalePercent && workingOptions.scalePercent !== 100) {
    const ratio = workingOptions.scalePercent / 100;
    const targetWidth = Math.max(1, Math.round(width * ratio));
    const targetHeight = Math.max(1, Math.round(height * ratio));
    workingFrames = applyScaleToFrames(workingFrames, targetWidth, targetHeight);
    currentWidth = targetWidth;
    currentHeight = targetHeight;
  } else {
    workingFrames = workingFrames.map((frame, index) => ({
      ...frame,
      previewUrl: frame.previewUrl ?? imageDataToDataUrl(frame.imageData),
      id: `${frame.id || 'frame'}-scaled-${index}`,
    }));
  }

  if (workingOptions.targetFps) {
    workingFrames = reduceFramesToFps(workingFrames, workingOptions.targetFps);
  }

  if (workingOptions.optimizeBackground) {
    workingFrames = mergeDuplicateFrames(workingFrames);
  }

  workingFrames = await remapPalette(workingFrames, workingOptions.paletteSize, {
    dither: workingOptions.dither,
  });

  const fps = estimateFps(workingFrames);
  const paletteEffective = Math.min(256, Math.max(2, workingOptions.paletteSize));
  const estimatedBytes = estimateGifBytes(workingFrames, currentWidth, currentHeight, paletteEffective);

  return {
    frames: workingFrames,
    width: currentWidth,
    height: currentHeight,
    fps,
    paletteSize: paletteEffective,
    estimatedBytes,
  };
}
