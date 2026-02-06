<script>
  /**
   * 滑块对比预览弹窗 - 原图+结果并排 + 滑块对比
   */
  import { t } from '../lib/i18n.js';
  import { formatFileSize } from '../lib/imageProcessor.js';

  let {
    open = false,
    item = null,
    resultBlobUrl = null,
    onClose = () => {},
  } = $props();

  let comparePos = $state(50);

  $effect(() => {
    if (open) comparePos = 50;
  });
</script>

{#if open && item && resultBlobUrl}
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
        <button onclick={onClose} class="btn preset-outlined-surface-200-800 btn-sm" aria-label={t('common.close')}>
          {t('common.close')}
        </button>
      </div>
      <div class="flex-1 overflow-auto p-4">
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="flex flex-col items-center">
            <p class="text-sm text-surface-600-400 mb-2">{t('common.original')} · {formatFileSize(item.size)}</p>
            <img
              src={item.previewUrl}
              alt="Original"
              class="max-w-full max-h-[60vh] object-contain rounded border border-surface-200-800"
            />
          </div>
          <div class="flex flex-col items-center">
            <p class="text-sm text-surface-600-400 mb-2">{t('common.result')} · {formatFileSize(item.newSize ?? 0)}</p>
            <img
              src={resultBlobUrl}
              alt="Result"
              class="max-w-full max-h-[60vh] object-contain rounded border border-surface-200-800"
            />
          </div>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-surface-600-400">{t('common.sliderCompare')}</span>
          <input
            type="range"
            min="0"
            max="100"
            bind:value={comparePos}
            class="input flex-1 max-w-xs"
          />
        </div>
        <div class="relative mt-2 rounded overflow-hidden border border-surface-200-800" style="aspect-ratio: 16/9; max-height: 40vh;">
          <img
            src={item.previewUrl}
            alt="Original"
            class="absolute inset-0 w-full h-full object-contain"
          />
          <div class="absolute inset-0 overflow-hidden" style="clip-path: inset(0 {100 - comparePos}% 0 0);">
            <img
              src={resultBlobUrl}
              alt="Result"
              class="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          <div
            class="absolute top-0 bottom-0 w-0.5 bg-primary-500 pointer-events-none"
            style="left: {comparePos}%;"
          ></div>
        </div>
      </div>
    </div>
  </div>
{/if}
