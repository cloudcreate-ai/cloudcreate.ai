import { browser } from '$app/environment';
import { decodeGifFile } from '$lib/gif/utils.js';

/** Placeholder：若未来需要真正的 Worker，这里可扩展为 worker loader */
export async function decodeGifViaWorker(file) {
  if (!browser || typeof Worker === 'undefined') {
    return decodeGifFile(file);
  }
  // TODO: worker 实现。当前直接在主线程解析。
  return decodeGifFile(file);
}
