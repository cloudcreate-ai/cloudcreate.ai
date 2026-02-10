/**
 * 表格工具 - 解析 CSV/TSV/XLSX/JSON，预览与格式转换
 */
import * as XLSX from 'xlsx';

/** 支持格式 */
export const FORMATS = ['csv', 'tsv', 'xlsx', 'json'];

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
      [headers = [], ...rows] = arr.map((r) => (Array.isArray(r) ? r.map(String) : [String(r)]));
    } else {
      headers = [...new Set(arr.flatMap((o) => (typeof o === 'object' && o !== null ? Object.keys(o) : [])))];
      rows = arr.map((o) =>
        typeof o === 'object' && o !== null ? headers.map((h) => (o[h] != null ? String(o[h]) : '')) : [String(o)]
      );
    }
    return { sheets: [{ name: 'Sheet1', headers, rows }], format: 'json' };
  }

  if (ext === 'csv' || ext === 'tsv') {
    const text = await file.text();
    const wb = XLSX.read(text, { type: 'string', FS: ext === 'tsv' ? '\t' : ',' });
    return workbookToSheets(wb, ext);
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    return workbookToSheets(wb, 'xlsx');
  }

  throw new Error(`Unsupported format: ${ext}`);
}

function workbookToSheets(wb, format) {
  const sheets = [];
  for (const name of wb.SheetNames || []) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const [headers = [], ...rows] = data.map((r) => (Array.isArray(r) ? r.map(String) : [String(r)]));
    sheets.push({ name, headers, rows });
  }
  if (sheets.length === 0) sheets.push({ name: 'Sheet1', headers: [], rows: [] });
  return { sheets, format };
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
