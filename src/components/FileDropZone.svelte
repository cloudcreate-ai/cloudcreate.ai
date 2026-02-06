<script>
  /**
   * 文件拖放区 - 点击/拖拽选择图片
   */
  import { t } from '../lib/i18n.js';
  import { ACCEPT_IMAGES } from '../lib/batchHelpers.js';

  let {
    multiple = true,
    onFilesAdd = () => {},
    accept = ACCEPT_IMAGES,
    idPrefix = 'fdz',
  } = $props();

  let inputRef = $state(null);
  let dropActive = $state(false);

  function handleInput(e) {
    const files = e.target?.files;
    if (files?.length) onFilesAdd(Array.from(files));
    if (inputRef) inputRef.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    dropActive = false;
    const files = e.dataTransfer?.files;
    if (files?.length) onFilesAdd(Array.from(files));
  }

  function handleDragOver(e) {
    e.preventDefault();
    dropActive = true;
  }

  function handleDragLeave() {
    dropActive = false;
  }

  const hintKey = $derived(multiple ? 'common.addImages' : 'common.addImage');
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  role="button"
  tabindex="0"
  class="card preset-outlined-surface-200-800 p-6 text-center cursor-pointer transition {dropActive ? 'border-primary-500 bg-primary-500/5' : ''}"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onclick={() => inputRef?.click()}
  onkeydown={(e) => e.key === 'Enter' && inputRef?.click()}
>
  <input
    type="file"
    {accept}
    multiple={multiple}
    onchange={handleInput}
    bind:this={inputRef}
    class="hidden"
    id="{idPrefix}-input"
  />
  <p class="text-surface-600-400 m-0">{t(hintKey)}</p>
  <p class="text-sm text-surface-600-400 mt-1 m-0">{t('common.formats')}</p>
</div>
