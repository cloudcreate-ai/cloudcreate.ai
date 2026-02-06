/**
 * 简单 i18n：中英双语，默认根据浏览器语言选择
 */
import { writable, get } from 'svelte/store';

const STORAGE_KEY = 'freetools-locale';

const translations = {
  en: {
    common: {
      workspace: 'Workspace',
      backWorkspace: '← Workspace',
      options: 'Options',
      quality: 'Quality',
      addImages: 'Click to select or drag and drop images here',
      addImage: 'Click to select or drag and drop an image',
      formats: 'JPEG, PNG, WebP, AVIF',
      compress: 'Compress',
      convert: 'Convert',
      clearAll: 'Clear All',
      downloadAll: 'Download All',
      download: 'Download',
      preview: 'Preview',
      close: 'Close',
      processing: 'Processing...',
      original: 'Original',
      result: 'Result',
      fileList: 'File List',
      filename: 'Filename',
      format: 'Format',
      size: 'Size',
      dimensions: 'Dimensions',
      smaller: 'smaller',
      larger: 'larger',
      same: 'Same',
      sameSize: 'Same size',
      total: 'Total',
      sliderCompare: 'Slider: compare in one view',
      errAddOne: 'Please add at least one image.',
      changeImage: 'Change image',
      sameAsOriginal: 'Same as original',
    },
    pageTitle: 'FreeTools - Browser Utility Collection',
    home: {
      title: 'FreeTools',
      subtitle: 'Browser-based utility collection',
      compressTitle: 'Image Compress & Convert',
      compressDesc: 'Reduce file size, convert format (JPEG, PNG, WebP, AVIF). Quality adjustable. Batch supported.',
      cropTitle: 'Image Crop',
      cropDesc: 'Crop by drag or exact size. Free/fixed ratio. Same format output.',
      resizeTitle: 'Image Resize',
      resizeDesc: 'Scale by percentage or max dimension. Same format output. Batch supported.',
    },
    compress: {
      title: 'Image Compress & Convert',
      desc: 'Reduce file size and convert format (JPEG, PNG, WebP, AVIF).',
      outputFormat: 'Output format',
    },
    crop: {
      title: 'Image Crop',
      desc: 'Crop image by drag or enter exact size. Free ratio and fixed ratios supported. Same format output.',
      aspectRatio: 'Aspect Ratio',
      widthPx: 'Width (px)',
      heightPx: 'Height (px)',
      applySize: 'Apply size',
      cropping: 'Cropping...',
      crop: 'Crop',
      originalImage: 'Original Image',
      resultComparison: 'Result & Comparison',
      aspectRatioLabel: 'Aspect ratio',
      errAddFirst: 'Please add an image first.',
      cropFailed: 'Crop failed',
      free: 'Free',
    },
    resize: {
      title: 'Image Resize',
      desc: 'Scale images by percentage or max dimension. Same format output.',
      byPercent: 'By percentage',
      byMax: 'Limit width and height',
      byWidth: 'By width',
      byHeight: 'By height',
      byLong: 'By long edge',
      scalePercent: 'Scale',
      maxWidth: 'Max width (px)',
      maxHeight: 'Max height (px)',
      targetWidth: 'Width',
      targetHeight: 'Height',
      targetLong: 'Long edge',
      maxLabel: 'Max',
      resize: 'Resize',
    },
  },
  zh: {
    common: {
      workspace: '工作区',
      backWorkspace: '← 工作区',
      options: '选项',
      quality: '质量',
      addImages: '点击选择或拖放图片到此处',
      addImage: '点击选择或拖放图片',
      formats: 'JPEG、PNG、WebP、AVIF',
      compress: '压缩',
      convert: '转换',
      clearAll: '清空',
      downloadAll: '全部下载',
      download: '下载',
      preview: '预览',
      close: '关闭',
      processing: '处理中...',
      original: '原图',
      result: '结果',
      fileList: '文件列表',
      filename: '文件名',
      format: '格式',
      size: '大小',
      dimensions: '尺寸',
      smaller: '更小',
      larger: '更大',
      same: '相同',
      sameSize: '相同大小',
      total: '总计',
      sliderCompare: '滑块：单视图对比',
      errAddOne: '请至少添加一张图片。',
      changeImage: '更换图片',
      sameAsOriginal: '同原图',
    },
    pageTitle: 'FreeTools - 浏览器实用工具集',
    home: {
      title: 'FreeTools',
      subtitle: '浏览器实用工具集',
      compressTitle: '图片压缩与格式转换',
      compressDesc: '减小体积、转换格式（JPEG、PNG、WebP、AVIF），支持调节质量，支持批量。',
      cropTitle: '图片裁剪',
      cropDesc: '拖拽或输入精确尺寸裁剪，支持自由/固定比例，输出同格式。',
      resizeTitle: '图片缩放',
      resizeDesc: '按比例或最大边缩放，输出同格式，支持批量。',
    },
    compress: {
      title: '图片压缩与格式转换',
      desc: '减小体积、转换格式（JPEG、PNG、WebP、AVIF）。',
      outputFormat: '输出格式',
    },
    crop: {
      title: '图片裁剪',
      desc: '拖拽框选或输入精确尺寸裁剪，支持自由/固定比例，输出同格式。',
      aspectRatio: '宽高比',
      widthPx: '宽 (px)',
      heightPx: '高 (px)',
      applySize: '应用尺寸',
      cropping: '裁剪中...',
      crop: '裁剪',
      originalImage: '原图信息',
      resultComparison: '结果与对比',
      aspectRatioLabel: '宽高比',
      errAddFirst: '请先添加图片。',
      cropFailed: '裁剪失败',
      free: '自由',
    },
    resize: {
      title: '图片缩放',
      desc: '按比例或最大边缩放，输出同格式。',
      byPercent: '按比例',
      byMax: '限制宽高',
      byWidth: '按宽',
      byHeight: '按高',
      byLong: '按长边',
      scalePercent: '缩放比例',
      maxWidth: '最大宽 (px)',
      maxHeight: '最大高 (px)',
      targetWidth: '宽度',
      targetHeight: '高度',
      targetLong: '长边',
      maxLabel: '最大',
      resize: '缩放',
    },
  },
};

function detectLocale() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('zh')) return 'zh';
  }
  return 'en';
}

export const locale = writable(detectLocale());

export function setLocale(lang) {
  if (lang !== 'zh' && lang !== 'en') return;
  locale.set(lang);
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, lang);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = t('pageTitle');
  }
}

export function t(key) {
  const keys = key.split('.');
  const dict = translations[get(locale)] || translations.en;
  let obj = dict;
  for (const k of keys) {
    obj = obj?.[k];
    if (obj === undefined) return key;
  }
  return typeof obj === 'string' ? obj : key;
}

// 初始化时设置 html lang 和 title
if (typeof document !== 'undefined') {
  const initLang = get(locale);
  document.documentElement.lang = initLang === 'zh' ? 'zh-CN' : 'en';
  document.title = (initLang === 'zh' ? translations.zh.pageTitle : translations.en.pageTitle);
}
