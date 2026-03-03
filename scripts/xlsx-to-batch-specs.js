/**
 * 从《渠道素材需求表格.xlsx》生成 static/specs/batch-specs.json
 * 用法：npm run gen:batch-specs
 * 依赖：xlsx，输入文件 tempfiles/渠道素材需求表格.xlsx
 */
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INPUT = path.join(ROOT, 'tempfiles', '渠道素材需求表格.xlsx');
const OUTPUT = path.join(ROOT, 'static', 'specs', 'batch-specs.json');

const VIDEO_SIZE_MAP = { '1080p': [1920, 1080], '720p': [1280, 720], '480p': [854, 480], '360p': [640, 360] };

function parseSize(str) {
  if (str == null || String(str).trim() === '') return null;
  const s = String(str).trim().replace(/[×*xX]/g, 'x').replace(/\s+/g, ' ');
  const m = s.match(/(\d+)\s*x\s*(\d+)/);
  if (m) return { w: parseInt(m[1], 10), h: parseInt(m[2], 10) };
  const pMatch = s.toLowerCase().match(/(\d+)\s*p/);
  if (pMatch) {
    const key = pMatch[1] + 'p';
    const dim = VIDEO_SIZE_MAP[key];
    if (dim) return { w: dim[0], h: dim[1] };
  }
  return null;
}

function parseFormat(str) {
  if (!str || typeof str !== 'string') return 'webp';
  const s = str.trim().toLowerCase();
  if (s.includes('gif')) return 'gif';
  if (s.includes('mp4') || s.includes('视频')) return 'video';
  if (s.includes('png')) return 'png';
  if (s.includes('jpg') || s.includes('jpeg')) return 'jpeg';
  if (s.includes('webp')) return 'webp';
  return 'webp';
}

function parseMaxSizeKb(str) {
  if (!str || typeof str !== 'string') return undefined;
  const s = str.trim().replace(/[＜<>]/g, '').toLowerCase();
  if (s === '无' || s === '') return undefined;
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(kb|k|mb|m)?$/);
  if (!m) return undefined;
  let n = parseFloat(m[1]);
  const unit = (m[2] || 'kb').toLowerCase();
  if (unit === 'mb' || unit === 'm') n *= 1024;
  return Math.round(n);
}

function safeNamePart(s) {
  return String(s || '').trim().replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_') || 'unknown';
}

/** 按表头名找列索引：表头单元格必须包含完整关键词（避免「渠道」匹配到「渠道id」） */
function findColumnIndex(headerRow, names) {
  const h = (headerRow || []).map((c) => String(c ?? '').trim());
  return h.findIndex((cell) =>
    names.some((name) => {
      const n = String(name).trim();
      if (!n) return false;
      const cellLower = cell.toLowerCase();
      const nLower = n.toLowerCase();
      return cellLower === nLower || cellLower.includes(nLower);
    })
  );
}

function run() {
  if (!fs.existsSync(INPUT)) {
    console.error('Input not found:', INPUT);
    process.exit(1);
  }
  const buf = fs.readFileSync(INPUT);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const header = data[0] || [];
  const rows = data.slice(1);

  const idx = (names, fallback) => {
    const i = findColumnIndex(header, names);
    return i >= 0 ? i : fallback;
  };
  const colChannel = idx(['渠道', 'channel'], 0);
  const colChannelId = findColumnIndex(header, ['渠道id', '渠道ID', 'channel id', 'channelId']);
  const colSlot = idx(['素材位', '素材', 'slot'], 1);
  const colSlotId = findColumnIndex(header, ['素材位id', '素材位ID', '素材id', 'slot id', 'slotId']);
  const colSize = idx(['尺寸', 'size'], 2);
  const colQuantity = findColumnIndex(header, ['数量', 'quantity']);
  const colFormat = idx(['格式', 'format'], 4);
  const colLimit = idx(['大小限制', '限制', 'size limit', 'max'], 5);

  let channel = '';
  /** 渠道 id 为整表/整渠道统一设置，常只在某一行填写，此处跨行沿用 */
  let channelId = '';
  const specs = [];
  const seen = new Set();
  for (const row of rows) {
    const c = row[colChannel];
    const channelIdRaw = colChannelId >= 0 ? row[colChannelId] : undefined;
    const slot = row[colSlot];
    const slotIdRaw = colSlotId >= 0 ? row[colSlotId] : undefined;
    const sizeStr = row[colSize];
    const fmtStr = row[colFormat];
    const sizeLimitStr = row[colLimit];
    if (c && String(c).trim()) {
      const newChannel = String(c).trim();
      if (newChannel !== channel) channelId = '';
      channel = newChannel;
    }
    if (channelIdRaw != null && String(channelIdRaw).trim() !== '') channelId = String(channelIdRaw).trim();
    if (!channel || !slot) continue;
    let format = parseFormat(String(fmtStr || ''));
    const slotStr = String(slot ?? '').toLowerCase();
    if (slotStr.includes('gif')) format = 'gif';
    else if (slotStr.includes('视频') || slotStr.includes('video') || slotStr.includes('mp4')) format = 'video';
    let dim = parseSize(String(sizeStr ?? ''));
    if (!dim && format === 'video') dim = { w: 1920, h: 1080 };
    if (!dim) continue;
    const maxSizeKb = parseMaxSizeKb(String(sizeLimitStr || ''));
    const quantityRaw = colQuantity >= 0 ? row[colQuantity] : undefined;
    const quantity = Math.max(1, parseInt(quantityRaw, 10) || 1);
    const channelPart = channelId ? channelId : channel;
    const slotPart = (slotIdRaw != null && String(slotIdRaw).trim() !== '') ? String(slotIdRaw).trim() : slot;
    const name = [safeNamePart(channelPart), safeNamePart(slotPart), dim.w + 'x' + dim.h].join('_').toLowerCase();
    const uniqKey = name + '\0' + format;
    if (seen.has(uniqKey)) continue;
    seen.add(uniqKey);
    specs.push({
      name,
      width: dim.w,
      height: dim.h,
      format: format === 'jpeg' ? 'jpeg' : format,
      quality: 85,
      quantity,
      ...(maxSizeKb > 0 && { maxSizeKb }),
    });
  }

  const outDir = path.dirname(OUTPUT);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(specs, null, 2), 'utf8');
  console.log('Written', specs.length, 'specs to', OUTPUT);
}

run();
