/**
 * 表格工具 - 解析 CSV/TSV/XLSX/JSON，预览与格式转换
 *
 * 策略：不依赖 SheetJS 对日期/数字的格式化与类型推断结果做展示；一律取原始单元格值再转为字符串，
 * 预览与导出与用户文件中的字面量一致（CSV/TSV 配合 read raw: true 避免日期变序列号等）。
 */
import * as XLSX from 'xlsx';

/** 支持格式 */
export const FORMATS = ['csv', 'tsv', 'xlsx', 'json'];

/** 将解析得到的单元格值转为用于展示与再导出的纯文本，不做日期/货币等格式美化 */
function cellToOriginalString(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function normalizeTableRow(row) {
  if (!Array.isArray(row)) return [cellToOriginalString(row)];
  return row.map(cellToOriginalString);
}

/**
 * 从 File 解析为表格数据
 * @param {File} file
 * @returns {Promise<{ sheets: Array<{ name: string, headers: string[], rows: any[][] }>, format: string }>}
 */
export async function parseTableFile(file) {
  const ext = (file.name.match(/\.([^.]+)$/)?.[1] || '').toLowerCase();

  if (ext === 'json') {
    const text = await file.text();
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : [data];
    if (arr.length === 0) return { sheets: [{ name: 'Sheet1', headers: [], rows: [] }], format: 'json' };
    const first = arr[0];
    let headers, rows;
    if (Array.isArray(first)) {
      [headers = [], ...rows] = arr.map((r) => (Array.isArray(r) ? normalizeTableRow(r) : [cellToOriginalString(r)]));
    } else {
      headers = [...new Set(arr.flatMap((o) => (typeof o === 'object' && o !== null ? Object.keys(o) : [])))];
      rows = arr.map((o) =>
        typeof o === 'object' && o !== null
          ? headers.map((h) => (o[h] != null ? cellToOriginalString(o[h]) : ''))
          : [cellToOriginalString(o)]
      );
    }
    return { sheets: [{ name: 'Sheet1', headers, rows }], format: 'json' };
  }

  if (ext === 'csv' || ext === 'tsv') {
    const text = await file.text();
    /** 扩展名为 .csv 但实为 TSV 的导出很常见（列间为 Tab 无逗号），需与逗号分隔区分 */
    let fs = ext === 'tsv' ? '\t' : ',';
    if (ext === 'csv') {
      const firstLine = (text.split(/\r?\n/).find((l) => l.trim()) ?? '').trimEnd();
      const tabCount = (firstLine.match(/\t/g) ?? []).length;
      const commaCount = (firstLine.match(/,/g) ?? []).length;
      if (tabCount > commaCount) fs = '\t';
    }
    /** raw: true — 纯文本格子不解析为日期/数值类型，避免「2026-03-26」→ Excel 序列号等 */
    const wb = XLSX.read(text, { type: 'string', FS: fs, raw: true });
    return { ...workbookToSheets(wb), format: ext };
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    return { ...workbookToSheets(wb), format: ext };
  }

  throw new Error(`Unsupported format: ${ext}`);
}

/**
 * @param {import('xlsx').WorkBook} wb
 */
function workbookToSheets(wb) {
  const sheets = [];
  for (const name of wb.SheetNames || []) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    /** raw: true 取单元格底层值 v，禁用 w（格式化显示文本），避免日期等被格式化成区域习惯 */
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
    const [headers = [], ...rows] = data.map((r) => normalizeTableRow(r));
    sheets.push({ name, headers, rows });
  }
  if (sheets.length === 0) sheets.push({ name: 'Sheet1', headers: [], rows: [] });
  return { sheets };
}

/**
 * 将表格数据转换为指定格式的 Blob
 * @param {{ sheets: Array<{ name: string, headers: string[], rows: any[][] }> }} result - 支持多表
 * @param {string} format - csv | tsv | xlsx | json
 * @param {number} [sheetIndex=0] - 导出哪一表（csv/tsv/json 仅导出当前表；xlsx 导出全部）
 * @returns {Blob}
 */
export function tableToBlob(result, format, sheetIndex = 0) {
  const sheets = result.sheets || [];
  const sheet = sheets[sheetIndex] || { headers: [], rows: [] };
  const { headers, rows } = sheet;
  const data = [headers, ...rows];

  if (format === 'json') {
    const arr = rows.map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i] ?? ''));
      return obj;
    });
    return new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json' });
  }

  if (format === 'csv' || format === 'tsv') {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const str = XLSX.utils.sheet_to_csv(ws, { FS: format === 'tsv' ? '\t' : ',', strip: false });
    return new Blob([str], { type: format === 'tsv' ? 'text/tab-separated-values' : 'text/csv' });
  }

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    for (let i = 0; i < sheets.length; i++) {
      const s = sheets[i];
      const d = [s.headers, ...s.rows];
      const ws = XLSX.utils.aoa_to_sheet(d);
      XLSX.utils.book_append_sheet(wb, ws, s.name || `Sheet${i + 1}`);
    }
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  throw new Error(`Unsupported output format: ${format}`);
}
