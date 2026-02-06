/**
 * E2E 测试用图片：内存 buffer，不依赖磁盘文件
 * 1x1 PNG，体积小、格式合法，可被压缩/裁剪/缩放流程处理
 */
const MINIMAL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export const minimalPngBuffer = Buffer.from(MINIMAL_PNG_BASE64, 'base64');

export function getTestImageFile() {
  return {
    name: 'test.png',
    mimeType: 'image/png',
    buffer: minimalPngBuffer,
  };
}
