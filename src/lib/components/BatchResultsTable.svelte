<script>
  /**
   * 批量结果表格 - 预览、文件名、格式、大小、尺寸、结果（状态/预览/下载）
   */
  import { t } from '$lib/i18n.js';
  import { formatFileSize, formatLabelFromFilename } from '$lib/imageProcessor.js';
  import { computeTotalStats } from '$lib/batchHelpers.js';

  let {
    items = [],
    totalStats: totalStatsProp,
    onPreview = () => {},
    onDownload = () => {},
    onDownloadAll = () => {},
    downloadAllLabel = t('common.downloadAll'),
  } = $props();

  const totalStats = $derived(totalStatsProp ?? computeTotalStats(items));
</script>

<section class="card preset-outlined-surface-200-800 overflow-hidden">
  <div class="flex justify-between items-center p-4 border-b border-surface-200-800 flex-wrap gap-2">
    <div class="flex items-center gap-4">
      <h2 class="text-base font-medium m-0">{t('common.fileList')}</h2>
      {#if totalStats}
        <span class="text-sm text-surface-600-400">
          {t('common.total')}: {formatFileSize(totalStats.totalOriginal)} → {formatFileSize(totalStats.totalNew)}
          <span class={totalStats.ratio > 0 ? 'text-success-500' : totalStats.ratio < 0 ? 'text-warning-500' : 'text-surface-600-400'}>
            ({totalStats.ratio > 0 ? totalStats.ratio.toFixed(1) + '% ' + t('common.smaller') : totalStats.ratio < 0 ? Math.abs(totalStats.ratio).toFixed(1) + '% ' + t('common.larger') : t('common.same')})
          </span>
        </span>
      {/if}
    </div>
    <button onclick={onDownloadAll} class="btn preset-outlined-surface-200-800 btn-sm">
      {downloadAllLabel}
    </button>
  </div>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-surface-200-800 text-surface-600-400 text-left">
          <th class="p-3 w-12">#</th>
          <th class="p-3 w-16">{t('common.preview')}</th>
          <th class="p-3 min-w-[220px]">{t('common.filename')}</th>
          <th class="p-3 w-16">{t('common.format')}</th>
          <th class="p-3 w-20">{t('common.size')}</th>
          <th class="p-3 w-24">{t('common.dimensions')}</th>
          <th class="p-3 min-w-[240px] text-right">{t('common.result')}</th>
        </tr>
      </thead>
      <tbody>
        {#each items as item, i}
          <tr class="border-b border-surface-200-800 last:border-b-0 hover:bg-surface-100-900/50">
            <td class="p-3">{i + 1}</td>
            <td class="p-3">
              <img src={item.previewUrl} alt="" class="w-12 h-12 object-cover rounded block" />
            </td>
            <td class="p-3 truncate min-w-[220px]" title={item.name}>{item.name}</td>
            <td class="p-3">{item.format}</td>
            <td class="p-3">{formatFileSize(item.size)}</td>
            <td class="p-3">
              {#if item.width != null && item.height != null}
                {#if item.newWidth != null && item.newHeight != null}
                  {item.width}×{item.height} → {item.newWidth}×{item.newHeight}
                {:else}
                  {item.width}×{item.height}
                {/if}
              {:else}
                {#if item.newWidth != null && item.newHeight != null}
                  — → {item.newWidth}×{item.newHeight}
                {:else}
                  —
                {/if}
              {/if}
            </td>
            <td class="p-3 text-right">
              {#if item.status === 'processing'}
                <span class="text-surface-600-400">{t('common.processing')}</span>
              {:else if item.status === 'error'}
                <span class="text-error-500">{item.error}</span>
              {:else if item.status === 'done'}
                <div class="space-y-0.5">
                  <div class="text-surface-600-400">
                    {#if item.newWidth != null && item.newHeight != null}
                      <span class="text-surface-500-500" title={t('common.dimensions')}>{item.newWidth}×{item.newHeight}</span>
                      <span class="mx-1">·</span>
                    {/if}
                    {formatLabelFromFilename(item.outputName)} · {formatFileSize(item.size)} → {formatFileSize(item.newSize)}
                  </div>
                  <div class={item.ratio > 0 ? 'text-success-500' : item.ratio < 0 ? 'text-warning-500' : 'text-surface-600-400'}>
                    {item.ratio > 0 ? item.ratio.toFixed(1) + '% ' + t('common.smaller') : item.ratio < 0 ? Math.abs(item.ratio).toFixed(1) + '% ' + t('common.larger') : t('common.sameSize')}
                  </div>
                  <div class="flex gap-1 mt-1">
                    <button
                      onclick={() => onPreview(item)}
                      class="btn preset-outlined-surface-200-800 btn-sm"
                    >
                      {t('common.preview')}
                    </button>
                    <button
                      onclick={() => onDownload(item)}
                      class="btn preset-outlined-surface-200-800 btn-sm"
                    >
                      {t('common.download')}
                    </button>
                  </div>
                </div>
              {:else}
                <span class="text-surface-600-400">—</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
