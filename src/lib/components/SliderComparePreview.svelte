<script>
  /**
   * 滑块对比预览 - 原图+结果并排 + 滑块对比；支持弹窗或页面内嵌
   */
  import { t } from '$lib/i18n.js';
  import { formatFileSize } from '$lib/imageProcessor.js';

  let {
    open = false,
    /** 为 true 时不渲染遮罩弹窗，仅渲染对比区（用于工具页内嵌） */
    inline = false,
    /** 内嵌模式下的区块标题；默认用 item.name */
    sectionTitle = '',
    item = null,
    resultBlobUrl = null,
    /** @type {() => void} */
    onClose = () => {},
  } = $props();

  let comparePos = $state(50);

  $effect(() => {
    if (item?.previewUrl && (open || inline)) comparePos = 50;
  });
</script>

{#snippet compareBody()}
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
    <div class="flex flex-col items-center">
      <p class="text-sm text-surface-600-400 mb-2">
        {t('common.original')} · {formatFileSize(item.size)}
        · {#if item.width != null && item.height != null}{item.width}×{item.height}{:else}—{/if}
      </p>
      <img
        src={item.previewUrl}
        alt="Original"
        class="max-w-full max-h-[60vh] object-contain rounded border border-surface-200-800"
      />
    </div>
    <div class="flex flex-col items-center">
      <p class="text-sm text-surface-600-400 mb-2">
        {t('common.result')} · {formatFileSize(item.newSize ?? 0)}
        · {#if item.newWidth != null && item.newHeight != null}{item.newWidth}×{item.newHeight}{:else}—{/if}
      </p>
      <img
        src={resultBlobUrl}
        alt="Result"
        class="max-w-full max-h-[60vh] object-contain rounded border border-surface-200-800"
      />
    </div>
  </div>
  <div class="flex flex-wrap items-center gap-4">
    <span class="text-sm text-surface-600-400 shrink-0">{t('common.sliderCompare')}</span>
    <input
      type="range"
      min="0"
      max="100"
      bind:value={comparePos}
      class="input flex-1 min-w-[120px] max-w-md"
    />
  </div>
  <!-- 固定高度容器 + object-contain，适配竖版 PDF 等比例 -->
  <div
    class="relative mt-2 rounded overflow-hidden border border-surface-200-800 w-full bg-surface-50-950"
    style="height: min(50vh, 640px);"
  >
    <img
      src={item.previewUrl}
      alt="Original"
      class="absolute inset-0 w-full h-full object-contain pointer-events-none"
    />
    <div class="absolute inset-0 overflow-hidden" style="clip-path: inset(0 {100 - comparePos}% 0 0);">
      <img
        src={resultBlobUrl}
        alt="Result"
        class="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />
    </div>
    <div
      class="absolute top-0 bottom-0 w-0.5 bg-primary-500 pointer-events-none z-10"
      style="left: {comparePos}%;"
    ></div>
  </div>
{/snippet}

{#if inline && item && resultBlobUrl}
  <section class="card preset-outlined-surface-200-800 p-4 mb-4 flex flex-col gap-1">
    <h3 class="text-sm font-medium m-0 text-surface-600-400">{sectionTitle || item.name}</h3>
    <div class="flex-1 overflow-auto">
      {@render compareBody()}
    </div>
  </section>
{:else if open && item && resultBlobUrl}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    role="dialog"
    aria-modal="true"
    aria-label="Preview comparison"
    tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && onClose()}
    onkeydown={(e) => e.key === 'Escape' && onClose()}
  >
    <div class="card preset-filled-surface-50-950 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <div class="flex justify-between items-center p-4 border-b border-surface-200-800">
        <h3 class="font-medium m-0">{item.name}</h3>
        <button
          type="button"
          onclick={() => onClose()}
          class="btn preset-outlined-surface-200-800 btn-sm"
          aria-label={t('common.close')}
        >
          {t('common.close')}
        </button>
      </div>
      <div class="flex-1 overflow-auto p-4">
        {@render compareBody()}
      </div>
    </div>
  </div>
{/if}
