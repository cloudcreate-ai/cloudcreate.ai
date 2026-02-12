/**
 * 文件选择相关常量与纯函数 - 不依赖 imageProcessor，可在 SSR/prerender 中安全加载
 */
export const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp,image/avif';

/**
 * 过滤出图片类型的文件
 * @param {FileList|File[]} fileList
 * @returns {File[]}
 */
export function filterImageFiles(fileList) {
  return Array.from(fileList || []).filter((f) => f.type?.startsWith('image/'));
}
