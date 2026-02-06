<script>
  /**
   * 预设工具页的 JSON 查看与下载按钮
   * 展示/下载当前流程（预设 + 用户选项覆盖）
   * @param {object} effectiveWorkflow - 含用户选项的流程 { version, name, description, steps }
   * @param {string} presetName - 下载文件名，如 compress、resize、crop
   */
  import { t } from '../lib/i18n.js';
  import { downloadBlob } from '../lib/batchHelpers.js';

  let { effectiveWorkflow = null, presetName = 'workflow' } = $props();

  let showModal = $state(false);

  const presetJson = $derived(
    effectiveWorkflow?.steps?.length
      ? {
          version: effectiveWorkflow.version ?? 1,
          name: effectiveWorkflow.name ?? presetName,
          description: effectiveWorkflow.description ?? '',
          steps: effectiveWorkflow.steps,
        }
      : null
  );

  function openView() {
    if (presetJson) showModal = true;
  }

  function closeView() {
    showModal = false;
  }

  function download() {
    if (!presetJson) return;
    const json = JSON.stringify(presetJson, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const name = (presetName || 'workflow').replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
    downloadBlob(blob, name);
  }
</script>

<div class="preset-json-actions flex items-center gap-2">
  <button
    class="btn preset-outlined-surface-200-800 btn-sm"
    onclick={openView}
    disabled={!presetJson}
    title={t('workflow.viewJson')}
  >
    {t('workflow.viewJson')}
  </button>
  <button
    class="btn preset-outlined-surface-200-800 btn-sm"
    onclick={download}
    disabled={!presetJson}
    title={t('workflow.downloadJson')}
  >
    {t('workflow.downloadJson')}
  </button>
</div>

{#if showModal && presetJson}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    role="dialog"
    aria-modal="true"
    aria-label={t('workflow.jsonModalTitle')}
    tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && closeView()}
    onkeydown={(e) => e.key === 'Escape' && closeView()}
  >
    <div class="card preset-filled-surface-50-950 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
      <div class="flex justify-between items-center p-4 border-b border-surface-200-800">
        <h3 class="font-medium m-0">{t('workflow.jsonModalTitle')}</h3>
        <div class="flex gap-2">
          <button
            class="btn preset-outlined-surface-200-800 btn-sm"
            onclick={() => navigator.clipboard?.writeText(JSON.stringify(presetJson, null, 2))}
          >
            Copy
          </button>
          <button class="btn preset-outlined-surface-200-800 btn-sm" onclick={closeView} aria-label={t('common.close')}>
            {t('common.close')}
          </button>
        </div>
      </div>
      <pre class="flex-1 overflow-auto p-4 text-sm font-mono whitespace-pre-wrap break-all"
        >{JSON.stringify(presetJson, null, 2)}</pre
      >
    </div>
  </div>
{/if}
