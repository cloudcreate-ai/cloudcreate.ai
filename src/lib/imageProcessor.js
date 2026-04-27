export {
  DECODE_FORMATS,
  ENCODE_FORMATS,
  compressImageBytes,
  compressImageData,
  compressImageFile,
  decodeImage,
  decodeImageBytes,
  encodeImage,
  encodeImageForFormat,
  encodePngQuantized,
  fileToImageData,
  formatFileSize,
  formatLabelFromFilename,
  getFormatFromFile,
  getImageFormatFromNameAndMime,
  normalizeImageFormat,
} from '@cloudcreate/freetools-core/image';

export async function getImageDimensions(file) {
  const bitmap = await createImageBitmap(file);
  const w = bitmap.width;
  const h = bitmap.height;
  bitmap.close();
  return { width: w, height: h };
}
