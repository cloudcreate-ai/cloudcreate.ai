/**
 * 页面级结构化数据配置（FAQ / HowTo）。
 * 只放“可验证、与页面真实能力一致”的内容，避免泛化营销描述。
 */

/**
 * @param {'en'|'zh'} lang
 * @returns {Array<Record<string, unknown>>}
 */
function imageCompressSchemas(lang) {
  const zh = lang === 'zh';
  const inLanguage = zh ? 'zh-CN' : 'en';
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: zh ? '如何在线压缩图片' : 'How to compress images online',
      inLanguage,
      step: [
        { '@type': 'HowToStep', text: zh ? '上传一张或多张图片。' : 'Upload one or multiple images.' },
        {
          '@type': 'HowToStep',
          text: zh
            ? '选择压缩质量与输出格式（如 WebP/JPEG）。'
            : 'Choose quality and output format (for example WebP/JPEG).',
        },
        { '@type': 'HowToStep', text: zh ? '预览结果并下载文件。' : 'Preview the result and download files.' },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage,
      mainEntity: [
        {
          '@type': 'Question',
          name: zh ? '图片会上传到服务器吗？' : 'Are images uploaded to a server?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: zh ? '该工具优先在浏览器本地处理文件。' : 'This tool processes files in the browser first.',
          },
        },
        {
          '@type': 'Question',
          name: zh ? '压缩后可以保持清晰度吗？' : 'Can I keep good quality after compression?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: zh
              ? '可以通过质量和格式参数平衡体积与清晰度。'
              : 'You can balance file size and clarity with quality and format settings.',
          },
        },
      ],
    },
  ];
}

/**
 * @param {'en'|'zh'} lang
 * @returns {Array<Record<string, unknown>>}
 */
function imageConvertSchemas(lang) {
  const zh = lang === 'zh';
  const inLanguage = zh ? 'zh-CN' : 'en';
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage,
      mainEntity: [
        {
          '@type': 'Question',
          name: zh ? '支持哪些图片格式互转？' : 'Which image formats can be converted?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: zh
              ? '常见格式如 PNG、JPEG、WebP 可互相转换。'
              : 'Common formats such as PNG, JPEG, and WebP are supported.',
          },
        },
        {
          '@type': 'Question',
          name: zh ? '批量转换是否可用？' : 'Is batch conversion available?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: zh ? '可一次处理多张图片并统一导出。' : 'You can process multiple images in one run and export together.',
          },
        },
      ],
    },
  ];
}

/**
 * @param {'en'|'zh'} lang
 * @returns {Array<Record<string, unknown>>}
 */
function pdfCompressSchemas(lang) {
  const zh = lang === 'zh';
  const inLanguage = zh ? 'zh-CN' : 'en';
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: zh ? '如何压缩 PDF 文件' : 'How to compress PDF files',
      inLanguage,
      step: [
        { '@type': 'HowToStep', text: zh ? '上传 PDF 文件。' : 'Upload a PDF file.' },
        { '@type': 'HowToStep', text: zh ? '选择压缩等级并开始处理。' : 'Select compression level and start processing.' },
        { '@type': 'HowToStep', text: zh ? '下载压缩后的 PDF。' : 'Download the compressed PDF.' },
      ],
    },
  ];
}

/**
 * @param {'en'|'zh'} lang
 * @returns {Array<Record<string, unknown>>}
 */
function tableSchemas(lang) {
  const zh = lang === 'zh';
  const inLanguage = zh ? 'zh-CN' : 'en';
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage,
      mainEntity: [
        {
          '@type': 'Question',
          name: zh ? '表格工具支持哪些场景？' : 'What can the table tools do?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: zh
              ? '支持表格预览、格式转换和基础数据处理。'
              : 'It supports table preview, format conversion, and basic data processing.',
          },
        },
      ],
    },
  ];
}

/** @type {Record<string, (lang: 'en'|'zh') => Array<Record<string, unknown>>>} */
const ROUTE_SCHEMA_FACTORIES = {
  '/image/compress': imageCompressSchemas,
  '/image/convert': imageConvertSchemas,
  '/pdf/compress': pdfCompressSchemas,
  '/table': tableSchemas,
};

/**
 * @param {string} logicalPath
 * @param {'en'|'zh'} lang
 * @returns {Array<Record<string, unknown>>}
 */
export function getRouteStructuredData(logicalPath, lang) {
  const factory = ROUTE_SCHEMA_FACTORIES[logicalPath];
  return factory ? factory(lang) : [];
}

