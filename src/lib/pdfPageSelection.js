export const PAGE_RANGE_ERROR_EMPTY = 'EMPTY_PAGE_RANGE';
export const PAGE_RANGE_ERROR_INVALID = 'INVALID_PAGE_RANGE';

export function parsePageRangeSpec(spec, pageCount, options = {}) {
  const emptyMode = options.empty === 'all' ? 'all' : 'none';
  const raw = String(spec || '').trim();

  if (!raw) {
    return emptyMode === 'all' ? getAllPages(pageCount) : [];
  }

  const out = [];
  const seen = new Set();

  for (const rawPart of raw.split(',')) {
    const part = rawPart.trim();
    if (!part) continue;

    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start < 1 || end < 1 || start > end || end > pageCount) {
        throw new Error(PAGE_RANGE_ERROR_INVALID);
      }
      for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
        if (!seen.has(pageNumber)) {
          seen.add(pageNumber);
          out.push(pageNumber);
        }
      }
      continue;
    }

    if (!/^\d+$/.test(part)) {
      throw new Error(PAGE_RANGE_ERROR_INVALID);
    }

    const pageNumber = Number(part);
    if (pageNumber < 1 || pageNumber > pageCount) {
      throw new Error(PAGE_RANGE_ERROR_INVALID);
    }
    if (!seen.has(pageNumber)) {
      seen.add(pageNumber);
      out.push(pageNumber);
    }
  }

  if (!out.length && emptyMode !== 'all') {
    throw new Error(PAGE_RANGE_ERROR_EMPTY);
  }

  return out;
}

export function pageRangeFromPages(pages) {
  const normalized = Array.from(new Set((pages || []).map(Number).filter((page) => Number.isInteger(page) && page > 0))).sort(
    (a, b) => a - b,
  );
  if (!normalized.length) return '';

  const chunks = [];
  let start = normalized[0];
  let previous = normalized[0];

  for (let index = 1; index <= normalized.length; index += 1) {
    const current = normalized[index];
    if (current === previous + 1) {
      previous = current;
      continue;
    }
    chunks.push(start === previous ? String(start) : `${start}-${previous}`);
    start = current;
    previous = current;
  }

  return chunks.join(',');
}

export function getAllPages(pageCount) {
  return Array.from({ length: Math.max(0, pageCount) }, (_, idx) => idx + 1);
}

export function getOddPages(pageCount) {
  return getAllPages(pageCount).filter((pageNumber) => pageNumber % 2 === 1);
}

export function getEvenPages(pageCount) {
  return getAllPages(pageCount).filter((pageNumber) => pageNumber % 2 === 0);
}
