<script>
  /**
   * 统一文件选择组件 - 点击/拖拽选择文件，统一样式与操作
   */
  import { t } from '$lib/i18n.js';
  import { ACCEPT_IMAGES } from '$lib/batchHelpers.js';

  let {
    multiple = true,
    onFilesAdd = () => {},
    onDropRaw = undefined,
    /** @type {string} */ accept = ACCEPT_IMAGES,
    webkitdirectory = false,
    disabled = false,
    hintKey = 'common.fileSelectHint',
    formatsKey = 'common.formats',
    selectedName = '',
    onClear,
    showClear = false,
    idPrefix = 'fdz',
  } = $props();

  let inputRef = $state(null);
  let dropActive = $state(false);

  function handleInput(e) {
    if (disabled) return;
    const files = e.target?.files;
    if (files?.length) onFilesAdd(Array.from(files));
    if (inputRef) inputRef.value = '';
  }

  async function handleDrop(e) {
    e.preventDefault();
    dropActive = false;
    if (disabled) return;
    if (onDropRaw) {
      await onDropRaw(e);
      return;
    }
    const files = e.dataTransfer?.files;
    if (files?.length) onFilesAdd(Array.from(files));
  }

  function handleDragOver(e) {
    e.preventDefault();
    if (disabled) return;
    dropActive = true;
  }

  function handleDragLeave() {
    dropActive = false;
  }

  function handleClick() {
    if (disabled) return;
    inputRef?.click();
  }

  const showFormats = $derived(Boolean(formatsKey));
  const showClearBtn = $derived(Boolean(onClear && showClear));
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  role="button"
  tabindex={disabled ? -1 : 0}
  aria-disabled={disabled}
  class="file-drop-zone card preset-outlined-surface-200-800 p-6 text-center cursor-pointer transition {dropActive ? 'is-active' : ''} {disabled ? 'is-disabled' : ''}"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onclick={handleClick}
  onkeydown={(e) => e.key === 'Enter' && handleClick()}
>
  <input
    type="file"
    {accept}
    multiple={multiple}
    webkitdirectory={webkitdirectory}
    onchange={handleInput}
    bind:this={inputRef}
    class="hidden"
    id="{idPrefix}-input"
  />
  <p class="hint text-surface-600-400 m-0">{t(hintKey)}</p>
  {#if showFormats}
    <p class="formats text-sm text-surface-600-400 mt-1 m-0">{t(formatsKey)}</p>
  {/if}
  {#if selectedName}
    <p class="selected-name text-sm text-primary-500 mt-1 m-0">{selectedName}</p>
  {/if}
  {#if showClearBtn}
    <button
      type="button"
      class="btn btn-sm preset-outlined-surface-200-800 mt-3"
      onclick={(e) => {
        e.stopPropagation();
        if (inputRef) inputRef.value = '';
        onClear?.();
      }}
    >
      {t('common.clearAll')}
    </button>
  {/if}
</div>

<style>
  .file-drop-zone.is-active {
    border-color: var(--ccw-accent);
    background: rgba(10, 132, 255, 0.08);
  }
  .file-drop-zone.is-disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
