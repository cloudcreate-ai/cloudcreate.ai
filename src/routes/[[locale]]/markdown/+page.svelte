<script>
  /**
   * Markdown 在线预览 - 左编辑右预览
   */
  import { t } from '$lib/i18n.js';
  import { markdownToHtml } from '$lib/markdownTools.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';

  let text = $state('');
  let dropActive = $state(false);
  let inputRef = $state(null);
  let editCollapsed = $state(false);

  const html = $derived(markdownToHtml(text));

  async function handleFile(file) {
    if (!file) return;
    const raw = await file.text();
    text = raw;
  }

  async function handleInputChange(e) {
    const f = e.target?.files?.[0];
    if (f) await handleFile(f);
    if (inputRef) inputRef.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    dropActive = false;
    const f = e.dataTransfer?.files?.[0];
    if (f && /\.(md|markdown|txt)$/i.test(f.name)) handleFile(f);
  }

  function handleDragOver(e) {
    e.preventDefault();
    dropActive = true;
  }

  function handleDragLeave() {
    dropActive = false;
  }

  function clear() {
    text = '';
    if (inputRef) inputRef.value = '';
  }
</script>

<main class="p-8 max-w-6xl mx-auto">
  <ToolPageHeader titleKey="markdownPreview.title" descKey="markdownPreview.desc" />

  <section class="mb-4">
    <p class="text-sm font-medium block mb-2 m-0">{t('markdownPreview.input')}</p>
    <div class="flex gap-2 mb-3">
      <input
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        class="hidden"
        bind:this={inputRef}
        onchange={handleInputChange}
      />
      <button type="button" class="btn btn-sm preset-outlined-surface-200-800" onclick={() => inputRef?.click()}>
        {t('markdownPreview.upload')}
      </button>
      <button type="button" class="btn btn-sm preset-outlined-surface-200-800" onclick={clear}>
        {t('common.clearAll')}
      </button>
    </div>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="card preset-outlined-surface-200-800 p-3 mb-3 cursor-pointer transition {dropActive ? 'border-primary-500 bg-primary-500/5' : ''}"
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      onclick={() => inputRef?.click()}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && inputRef?.click()}
    >
      <p class="text-surface-600-400 text-sm m-0">{t('markdownPreview.uploadHint')}</p>
    </div>
    <p class="text-xs text-surface-500-500 mb-2">{t('markdownPreview.orPaste')}</p>
  </section>

  <div
    class="grid gap-4 min-h-[400px] {editCollapsed ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}"
  >
    {#if !editCollapsed}
      <div class="flex flex-col">
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-medium">{t('markdownPreview.edit')}</span>
          <button
            type="button"
            class="btn btn-sm btn-ghost px-1 text-surface-600-400 hover:text-surface-900-100"
            onclick={() => (editCollapsed = true)}
            title={t('markdownPreview.collapse')}
          >
            ←
          </button>
        </div>
        <textarea
          bind:value={text}
          class="input font-mono text-sm w-full flex-1 min-h-[360px] resize-y"
          placeholder="# Hello&#10;&#10;**bold** *italic*"
          spellcheck="false"
        ></textarea>
      </div>
    {/if}
    <div class="flex flex-col">
      <div class="flex items-center justify-between mb-1">
        <span class="text-sm font-medium">{t('markdownPreview.preview')}</span>
        {#if editCollapsed}
          <button
            type="button"
            class="btn btn-sm preset-outlined-surface-200-800"
            onclick={() => (editCollapsed = false)}
          >
            {t('markdownPreview.expand')}
          </button>
        {/if}
      </div>
      <div
        class="markdown-preview card preset-outlined-surface-200-800 flex-1 min-h-[360px] p-4 overflow-auto"
      >
        {#if text.trim()}
          {@html html}
        {:else}
          <p class="text-surface-500-500 text-sm m-0">{t('markdownPreview.emptyHint')}</p>
        {/if}
      </div>
    </div>
  </div>
</main>

<style>
  .markdown-preview :global(h1) { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.5rem; }
  .markdown-preview :global(h2) { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
  .markdown-preview :global(h3) { font-size: 1.1rem; font-weight: 600; margin: 0.75rem 0 0.25rem; }
  .markdown-preview :global(p) { margin: 0 0 0.75rem; line-height: 1.6; }
  .markdown-preview :global(ul),
  .markdown-preview :global(ol) { margin: 0 0 0.75rem; padding-left: 1.5rem; }
  .markdown-preview :global(li) { margin-bottom: 0.25rem; }
  .markdown-preview :global(blockquote) {
    border-left: 4px solid var(--color-primary-500);
    margin: 0 0 0.75rem;
    padding-left: 1rem;
    color: var(--color-surface-600-400);
  }
  .markdown-preview :global(pre) {
    background: var(--color-surface-100-900);
    border-radius: 0.375rem;
    padding: 1rem;
    overflow-x: auto;
    margin: 0 0 0.75rem;
  }
  .markdown-preview :global(code) {
    font-family: ui-monospace, monospace;
    font-size: 0.9em;
  }
  .markdown-preview :global(pre code) { background: none; padding: 0; }
  .markdown-preview :global(hr) { border: none; border-top: 1px solid var(--color-surface-200-800); margin: 1rem 0; }
  .markdown-preview :global(table) { border-collapse: collapse; width: 100%; margin-bottom: 0.75rem; }
  .markdown-preview :global(th),
  .markdown-preview :global(td) { border: 1px solid var(--color-surface-200-800); padding: 0.5rem 0.75rem; text-align: left; }
  .markdown-preview :global(a) { color: var(--color-primary-500); text-decoration: underline; }
</style>
