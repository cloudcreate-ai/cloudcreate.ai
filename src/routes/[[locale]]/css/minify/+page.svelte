<script>
  /**
   * CSS 压缩 - 支持上传、粘贴，基础/激进模式
   */
  import { t } from '$lib/i18n.js';
  import { minifyBasic, minifyAggressive } from '$lib/cssTools.js';
  import { downloadBlob } from '$lib/batchHelpers.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';

  const MINIFY_BASIC = 'basic';
  const MINIFY_AGGRESSIVE = 'aggressive';

  let minifyLevel = $state(MINIFY_BASIC);
  let inputText = $state('');
  let outputText = $state('');
  let inputFileName = $state('');
  let processing = $state(false);
  let error = $state('');
  let dropActive = $state(false);
  let inputRef = $state(null);

  const ACCEPT_CSS = '.css,text/css,text/plain';

  async function handleFile(file) {
    if (!file) return;
    const text = await file.text();
    inputText = text;
    inputFileName = file.name.replace(/\.[^.]+$/, '') || 'style';
    outputText = '';
    error = '';
  }

  function handleInputChange(e) {
    const files = e.target?.files;
    if (files?.[0]) handleFile(files[0]);
    if (inputRef) inputRef.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    dropActive = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && /\.(css|txt)$/i.test(file.name)) handleFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    dropActive = true;
  }

  function handleDragLeave() {
    dropActive = false;
  }

  function process() {
    const raw = inputText.trim();
    if (!raw) {
      error = t('cssMinify.errEmptyInput');
      return;
    }
    error = '';
    outputText = '';
    processing = true;
    try {
      outputText = minifyLevel === MINIFY_AGGRESSIVE ? minifyAggressive(raw) : minifyBasic(raw);
    } catch (e) {
      error = e.message || 'Processing failed';
    } finally {
      processing = false;
    }
  }

  function download() {
    if (!outputText) return;
    const name = inputFileName ? `${inputFileName}.min.css` : 'output.min.css';
    const blob = new Blob([outputText], { type: 'text/css' });
    downloadBlob(blob, name);
  }

  function clear() {
    inputText = '';
    outputText = '';
    inputFileName = '';
    error = '';
    if (inputRef) inputRef.value = '';
  }
</script>

<main class="p-8 max-w-4xl mx-auto">
  <ToolPageHeader titleKey="cssMinify.title" descKey="cssMinify.desc" />

  <section class="mb-4">
    <div class="flex flex-wrap gap-4 items-center mb-3">
      <label class="flex items-center gap-2 cursor-pointer text-sm">
        <input type="radio" bind:group={minifyLevel} value={MINIFY_BASIC} class="radio" />
        <span>{t('cssMinify.basic')}</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer text-sm">
        <input type="radio" bind:group={minifyLevel} value={MINIFY_AGGRESSIVE} class="radio" />
        <span>{t('cssMinify.aggressive')}</span>
      </label>
    </div>
  </section>

  <section class="mb-4">
    <p class="text-sm font-medium block mb-2 m-0">{t('cssMinify.input')}</p>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="card preset-outlined-surface-200-800 p-4 mb-2 cursor-pointer transition {dropActive ? 'border-primary-500 bg-primary-500/5' : ''}"
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      onclick={() => inputRef?.click()}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && inputRef?.click()}
    >
      <input
        type="file"
        accept={ACCEPT_CSS}
        class="hidden"
        bind:this={inputRef}
        onchange={handleInputChange}
      />
      <p class="text-surface-600-400 text-sm m-0">{t('cssMinify.uploadHint')}</p>
      {#if inputFileName}
        <p class="text-sm text-primary-500 mt-1 m-0">{inputFileName}.css</p>
      {/if}
    </div>
    <p class="text-xs text-surface-500-500 mb-2">{t('cssMinify.orPaste')}</p>
    <textarea
      bind:value={inputText}
      class="input font-mono text-sm w-full min-h-[120px] resize-y"
      placeholder={".example { color: red; }"}
      spellcheck="false"
    ></textarea>
  </section>

  <section class="flex gap-3 mb-4">
    <button
      class="btn preset-filled-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
      onclick={process}
      disabled={processing || !inputText.trim()}
    >
      {processing ? t('common.processing') : t('cssMinify.process')}
    </button>
    <button class="btn preset-outlined-surface-200-800" onclick={clear}>{t('common.clearAll')}</button>
  </section>

  {#if error}
    <p class="text-sm text-error-500 mb-4">{error}</p>
  {/if}

  {#if outputText}
    <section class="card preset-outlined-surface-200-800 overflow-hidden">
      <div class="p-4 border-b border-surface-200-800 flex justify-between items-center">
        <h2 class="text-base font-medium m-0">{t('common.preview')}</h2>
        <button class="btn btn-sm preset-filled-primary-500" onclick={download}>{t('common.download')}</button>
      </div>
      <div class="p-4">
        <pre class="font-mono text-sm overflow-auto max-h-[400px] m-0 p-3 bg-surface-100-900 rounded"><code>{outputText}</code></pre>
        <p class="text-xs text-surface-500-500 mt-2 m-0">
          {outputText.length} {t('cssMinify.chars')} · {Math.round(new Blob([outputText]).size / 1024 * 10) / 10} KB
        </p>
      </div>
    </section>
  {/if}
</main>
