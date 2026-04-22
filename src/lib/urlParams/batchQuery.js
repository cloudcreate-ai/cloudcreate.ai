/**
 * 批处理：profile= builtin%3Axxx 或完整 key；prefix= ；hide=0|1；ich=0|1 文件名含渠道
 */
export function parseBatchQuery(sp) {
  const out = /** @type {{ selectedProfileKey?: string, globalFilePrefix?: string, hideUnsupported?: boolean, includeChannelInFilename?: boolean }} */ (
    {}
  );
  const prof = sp.get('profile') ?? sp.get('prof');
  if (prof != null && prof !== '') {
    try {
      out.selectedProfileKey = decodeURIComponent(prof);
    } catch {
      out.selectedProfileKey = prof;
    }
  }
  const prefix = sp.get('prefix') ?? sp.get('px');
  if (prefix != null) out.globalFilePrefix = prefix;
  const hide = sp.get('hide') ?? sp.get('hux');
  if (hide === '0' || hide === 'false' || hide === 'off') out.hideUnsupported = false;
  if (hide === '1' || hide === 'true' || hide === 'on') out.hideUnsupported = true;
  const ich = sp.get('ich') ?? sp.get('chf');
  if (ich === '0' || ich === 'false' || ich === 'off') out.includeChannelInFilename = false;
  if (ich === '1' || ich === 'true' || ich === 'on') out.includeChannelInFilename = true;
  return out;
}

export function buildBatchQuery(
  selectedProfileKey,
  globalFilePrefix,
  hideUnsupported,
  includeChannelInFilename
) {
  const p = new URLSearchParams();
  p.set('profile', encodeURIComponent(selectedProfileKey));
  if (globalFilePrefix) p.set('prefix', globalFilePrefix);
  p.set('hide', hideUnsupported ? '1' : '0');
  p.set('ich', includeChannelInFilename ? '1' : '0');
  return p;
}
