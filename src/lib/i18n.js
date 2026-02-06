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
      workflowTitle: 'Workflow Editor',
      workflowDesc: 'Visual workflow editor. Compose image processing steps (decode, crop, resize, encode). Presets and custom workflows.',
      compressTitle: 'Image Compress & Convert',
      compressDesc: 'Reduce file size, convert format (JPEG, PNG, WebP, AVIF). Quality adjustable. Batch supported.',
      cropTitle: 'Image Crop',
      cropDesc: 'Crop by drag or exact size. Free/fixed ratio. Output format selectable.',
      resizeTitle: 'Image Resize',
      resizeDesc: 'Scale by percentage or max dimension. Output format selectable. Batch supported.',
    },
    compress: {
      title: 'Image Compress & Convert',
      desc: 'Reduce file size and convert format (JPEG, PNG, WebP, AVIF).',
      outputFormat: 'Output format',
    },
    crop: {
      title: 'Image Crop',
      desc: 'Crop image by drag or enter exact size. Free ratio and fixed ratios supported. Output format selectable.',
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
    workflow: {
      title: 'Workflow Editor',
      run: 'Run',
      addNode: 'Add Node',
      stepSelectImages: 'Select images',
      stepCompress: 'Compress',
      stepResize: 'Resize',
      stepCrop: 'Crop',
      stepExport: 'Export',
      advancedMode: 'Advanced mode',
      simpleMode: 'Simple mode',
      addStep: 'Add step',
      selectNode: 'Select a node',
      noParams: 'No parameters',
      files: 'Files',
      fileCount: 'files',
      clearFiles: 'Clear',
      runHint: 'Add files and click Run.',
      runHintSelectInStep: 'Select images in the input step above, then click Run.',
      presetCompress: 'Compress',
      presetResize: 'Resize',
      presetCrop: 'Crop',
      cropRegion: 'Select crop region',
      cropManualHint: 'At runtime you will select the crop region for each image.',
      presetConfig: 'Preset config',
      deferredCropHint: 'Deferred: select crop region in popup for each image at runtime.',
      waitingCrop: 'Please select the crop region in the popup.',
      processingFile: 'Processing file {x}/{y}',
      inputManualHint: 'Manual setup: select images here before running.',
      applyCrop: 'Apply',
      workflowName: 'Name',
      load: 'Load',
      save: 'Save',
      export: 'Export',
      import: 'Import',
      viewJson: 'View JSON',
      downloadJson: 'Download JSON',
      importJson: 'Import JSON',
      jsonModalTitle: 'Workflow JSON',
      importPasteHint: 'Paste JSON here or choose a file',
      importError: 'Invalid workflow: steps array required (input, output, resize, crop).',
      importSuccess: 'Workflow imported.',
    },
    resize: {
      title: 'Image Resize',
      desc: 'Scale images by percentage or max dimension. Output format selectable.',
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
      workflowTitle: '工作流编辑器',
      workflowDesc: '可视化工作流编辑，组合图片处理步骤（解码、裁剪、缩放、编码），预设与自定义。',
      compressTitle: '图片压缩与格式转换',
      compressDesc: '减小体积、转换格式（JPEG、PNG、WebP、AVIF），支持调节质量，支持批量。',
      cropTitle: '图片裁剪',
      cropDesc: '拖拽或输入精确尺寸裁剪，支持自由/固定比例，可选输出格式。',
      resizeTitle: '图片缩放',
      resizeDesc: '按比例或最大边缩放，可选输出格式，支持批量。',
    },
    compress: {
      title: '图片压缩与格式转换',
      desc: '减小体积、转换格式（JPEG、PNG、WebP、AVIF）。',
      outputFormat: '输出格式',
    },
    crop: {
      title: '图片裁剪',
      desc: '拖拽框选或输入精确尺寸裁剪，支持自由/固定比例，可选输出格式。',
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
    workflow: {
      title: '工作流编辑器',
      run: '运行',
      addNode: '添加节点',
      stepSelectImages: '选择图片',
      stepCompress: '压缩',
      stepResize: '缩放',
      stepCrop: '裁剪',
      stepExport: '导出',
      advancedMode: '高级模式',
      simpleMode: '简易模式',
      addStep: '添加步骤',
      selectNode: '选择节点',
      noParams: '无参数',
      files: '文件',
      fileCount: '个文件',
      clearFiles: '清空',
      runHint: '添加文件后点击运行。',
      runHintSelectInStep: '请在上方「选择图片」步骤中选择文件，然后点击运行。',
      presetCompress: '压缩',
      presetResize: '缩放',
      presetCrop: '裁剪',
      cropRegion: '选择裁剪区域',
      cropManualHint: '执行到该步骤时，需为每张图片手动选择裁剪区域。',
      presetConfig: '预设配置',
      deferredCropHint: '延迟设置：执行时为每张图片在弹窗中选择裁剪区域。',
      waitingCrop: '请在弹窗中选择裁剪区域。',
      processingFile: '正在处理第 {x}/{y} 个文件',
      inputManualHint: '人工设置：运行前在此选择图片。',
      applyCrop: '应用',
      workflowName: '名称',
      load: '加载',
      save: '保存',
      export: '导出',
      import: '导入',
      viewJson: '查看 JSON',
      downloadJson: '下载 JSON',
      importJson: '导入 JSON',
      jsonModalTitle: '工作流 JSON',
      importPasteHint: '在此粘贴 JSON 或选择文件',
      importError: '无效工作流：需要 steps 数组（input、output、resize、crop）。',
      importSuccess: '工作流已导入。',
    },
    resize: {
      title: '图片缩放',
      desc: '按比例或最大边缩放，可选输出格式。',
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
