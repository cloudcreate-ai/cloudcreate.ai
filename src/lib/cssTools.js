/**
 * CSS 压缩与解压 - 基础/激进压缩、美化
 */
import { minify as cssoMinify } from 'csso';
import { css as cssBeautify } from 'js-beautify';

/** 基础压缩：移除注释、折叠空白（保持可读性） */
export function minifyBasic(css) {
  if (typeof css !== 'string') return '';
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // 移除 /* */ 注释
    .replace(/\s+/g, ' ')              // 折叠空白
    .trim();
}

/** 激进压缩：使用 csso */
export function minifyAggressive(css) {
  if (typeof css !== 'string') return '';
  try {
    const result = cssoMinify(css);
    return result.css;
  } catch (e) {
    throw new Error(e.message || 'Minify failed');
  }
}

/** 解压/美化 */
export function beautify(css) {
  if (typeof css !== 'string') return '';
  try {
    return cssBeautify(css, {
      indent_size: 2,
      indent_char: ' ',
      end_with_newline: true,
      preserve_newlines: false,
      max_preserve_newlines: 0,
      wrap_line_length: 0,
    });
  } catch (e) {
    throw new Error(e.message || 'Beautify failed');
  }
}
