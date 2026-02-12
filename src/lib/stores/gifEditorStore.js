import { writable, get } from 'svelte/store';
import { decodeGifViaWorker } from '$lib/workers/gifWorker.js';
import { buildCompressedFrames, estimateFps, encodeGif } from '$lib/gif/utils.js';

function createDefaultOptions() {
  return {
    targetFps: 0,
    scalePercent: 100,
    paletteSize: 128,
    dither: true,
    optimizeBackground: true,
    accuratePreview: true,
  };
}

function createInitialState() {
  return {
    fileName: '',
    fileSize: 0,
    width: 0,
    height: 0,
    loopCount: 0,
    frames: [],
    selectedIndex: 0,
    sourceFps: 0,
    sourcePaletteSize: 0,
    options: createDefaultOptions(),
    compression: {
      frames: [],
      width: 0,
      height: 0,
      fps: 0,
      paletteSize: 256,
      estimatedBytes: 0,
      running: false,
      dirty: false,
      lastUpdated: null,
      encodedGifBlob: null,
      encodedGifUrl: null,
    },
  };
}

const initialState = createInitialState();

function clampNumber(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function createGifEditorStore() {
  const store = writable(initialState);
  const { subscribe, set, update } = store;

  return {
    subscribe,
    async loadGif(file) {
      const result = await decodeGifViaWorker(file);
      const fps = estimateFps(result.frames);
      set({
        fileName: file.name,
        fileSize: file.size ?? 0,
        width: result.width,
        height: result.height,
        loopCount: result.loopCount,
        frames: result.frames,
        selectedIndex: 0,
        sourceFps: fps,
        sourcePaletteSize: result.sourcePaletteSize ?? 0,
        options: {
          targetFps: fps ? Math.max(1, Math.round(Math.min(60, fps))) : 24,
          scalePercent: 100,
          paletteSize: 128,
          dither: true,
          optimizeBackground: true,
        },
        compression: {
          frames: [],
          width: result.width,
          height: result.height,
          fps,
          paletteSize: 256,
          estimatedBytes: file.size ?? 0,
          running: false,
          dirty: true,
          lastUpdated: null,
          encodedGifBlob: null,
          encodedGifUrl: null,
        },
      });
    },
    reset() {
      const state = get(store);
      state.frames.forEach((frame) => {
        if (frame.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(frame.previewUrl);
        }
      });
      state.compression.frames?.forEach((frame) => {
        if (frame.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(frame.previewUrl);
        }
      });
      if (state.compression.encodedGifUrl) {
        URL.revokeObjectURL(state.compression.encodedGifUrl);
      }
      set(createInitialState());
    },
    selectFrame(index) {
      update((state) => ({
        ...state,
        selectedIndex: Math.max(0, Math.min(state.frames.length - 1, index)),
      }));
    },
    updateOptions(partial) {
      update((state) => {
        const nextOptions = {
          ...state.options,
          ...partial,
        };
        nextOptions.scalePercent = clampNumber(Number(nextOptions.scalePercent) || 100, 10, 400);
        nextOptions.paletteSize = clampNumber(Number(nextOptions.paletteSize) || 128, 8, 256);
        nextOptions.targetFps = clampNumber(
          Number(nextOptions.targetFps) || state.sourceFps || 24,
          1,
          Math.max(60, Math.round(state.sourceFps || 60)),
        );
        if (typeof nextOptions.accuratePreview !== 'boolean') {
          nextOptions.accuratePreview = state.options.accuratePreview ?? true;
        }
        if (state.compression.encodedGifUrl) {
          URL.revokeObjectURL(state.compression.encodedGifUrl);
        }
        return {
          ...state,
          options: nextOptions,
          compression: {
            ...state.compression,
            dirty: true,
            encodedGifBlob: null,
            encodedGifUrl: null,
          },
        };
      });
    },
    async generatePreview() {
      const snapshot = get(store);
      if (!snapshot.frames.length) return;
      update((state) => ({
        ...state,
        compression: {
          ...state.compression,
          running: true,
        },
      }));
      try {
        if (snapshot.compression?.encodedGifUrl) {
          URL.revokeObjectURL(snapshot.compression.encodedGifUrl);
        }
        const result = await buildCompressedFrames(snapshot.frames, snapshot.width, snapshot.height, snapshot.options);
        let encodedGifBlob = null;
        let encodedGifUrl = null;
        let estimatedBytes = result.estimatedBytes;
        if (snapshot.options.accuratePreview) {
          encodedGifBlob = await encodeGif(result.frames, {
            width: result.width,
            height: result.height,
            loop: snapshot.loopCount || 0,
          });
          encodedGifUrl = URL.createObjectURL(encodedGifBlob);
          estimatedBytes = encodedGifBlob.size;
        }
        update((state) => ({
          ...state,
          compression: {
            ...state.compression,
            ...result,
             estimatedBytes,
            running: false,
            dirty: false,
            lastUpdated: Date.now(),
            encodedGifBlob,
            encodedGifUrl,
          },
        }));
      } catch (error) {
        console.error('Failed to build GIF preview', error);
        update((state) => ({
          ...state,
          compression: {
            ...state.compression,
            running: false,
          },
        }));
        throw error;
      }
    },
    getExportPayload() {
      const state = get(store);
      const canUsePreview = state.compression.frames?.length && !state.compression.dirty && !state.compression.running;
      if (canUsePreview) {
        return {
          frames: state.compression.frames,
          width: state.compression.width,
          height: state.compression.height,
          loopCount: state.loopCount,
          paletteSize: state.compression.paletteSize,
        };
      }
      return {
        frames: state.frames,
        width: state.width,
        height: state.height,
        loopCount: state.loopCount,
        paletteSize: 256,
      };
    },
  };
}

export const gifEditorStore = createGifEditorStore();
