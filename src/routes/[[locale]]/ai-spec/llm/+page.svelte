<script>
  import { t } from '$lib/i18n.js';
  import { page } from '$app/stores';
  import { localePath } from '$lib/localePath.js';
  import WorkspacePageShell from '$lib/components/layout/WorkspacePageShell.svelte';

  /** @type {{ data: { body: string } }} */
  let { data } = $props();
  const txtHref = $derived(
    `${$page.url.origin}${localePath($page.url.pathname, '/ai-spec/llm.txt')}`
  );
  let copyUrlDone = $state(false);
  let copyUrlTimer = $state(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  async function copyTxtUrl() {
    const u = txtHref;
    if (!u) return;
    try {
      await navigator.clipboard.writeText(u);
      copyUrlDone = true;
      if (copyUrlTimer) clearTimeout(copyUrlTimer);
      copyUrlTimer = setTimeout(() => {
        copyUrlDone = false;
        copyUrlTimer = null;
      }, 2000);
    } catch {
      copyUrlDone = false;
    }
  }
</script>

<WorkspacePageShell wide={true}>
  <div class="workspace-content p-1">
    <p class="text-sm m-0 mb-2 text-[color:var(--ccw-text-muted)]">{t('agentPrompt.aiSpecPage.plainInBrowserBlurb')}</p>
    <div class="spec-plain-row">
      <span class="text-sm text-[color:var(--ccw-text-secondary)]">{t('agentPrompt.aiSpecPage.plainTextUrlLabel')}</span>
      <code class="spec-plain-code">{txtHref}</code>
      <button type="button" class="btn btn-sm preset-outlined-surface-200-800" onclick={copyTxtUrl}>
        {copyUrlDone ? t('agentPrompt.copied') : t('agentPrompt.aiSpecPage.copyPlainUrl')}
      </button>
    </div>
    <pre class="ai-spec-llm-pre">{data.body}</pre>
  </div>
</WorkspacePageShell>

<style>
  .spec-plain-url {
    color: var(--ccw-accent);
    word-break: break-all;
  }
  .spec-plain-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.75rem;
    margin: 0 0 0.75rem;
  }
  .spec-plain-code {
    display: block;
    flex: 1 1 12rem;
    min-width: 0;
    padding: 0.35rem 0.5rem;
    font-size: 0.7rem;
    line-height: 1.4;
    word-break: break-all;
    color: var(--ccw-text-primary);
    background: var(--ccw-bg-base);
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-button);
  }
  .ai-spec-llm-pre {
    margin: 0;
    max-width: 72rem;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: var(--ccw-font-mono, ui-monospace, monospace);
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--ccw-text-primary);
    background: var(--ccw-bg-elevated);
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    padding: 0.75rem 0.9rem;
  }
</style>
