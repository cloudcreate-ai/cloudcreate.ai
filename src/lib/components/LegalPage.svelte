<script>
  /**
   * 隐私政策 / 服务条款共用排版
   */
  import { t, locale } from '$lib/i18n.js';
  import WorkspacePageShell from '$lib/components/layout/WorkspacePageShell.svelte';
  import { getLegalBlocks, LEGAL_LAST_UPDATED } from '$lib/legalDocuments.js';

  /** @type {{ pageId: 'privacy' | 'terms' }} */
  let { pageId } = $props();

  const blocks = $derived(getLegalBlocks(pageId, $locale));
  const title = $derived(t(pageId === 'privacy' ? 'legal.privacyTitle' : 'legal.termsTitle'));
  const lastStr = $derived($locale === 'zh' ? LEGAL_LAST_UPDATED.zh : LEGAL_LAST_UPDATED.en);
</script>

<WorkspacePageShell layout="content">
  <article class="legal-page">
    <h1 class="legal-page-title">{title}</h1>
    <p class="legal-page-updated">{t('legal.lastUpdated')} {lastStr}</p>
    {#each blocks as block}
      {#if block.type === 'h2'}
        <h2 class="legal-page-h2">{block.text}</h2>
      {:else}
        <p class="legal-page-p">{block.text}</p>
      {/if}
    {/each}
  </article>
</WorkspacePageShell>

<style>
  .legal-page {
    width: 100%;
  }
  .legal-page-title {
    margin: 0 0 0.35rem;
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--ccw-text-primary);
    line-height: 1.3;
  }
  .legal-page-updated {
    margin: 0 0 1.25rem;
    font-size: 0.75rem;
    color: var(--ccw-text-muted);
  }
  .legal-page-h2 {
    margin: 1.1rem 0 0.45rem;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--ccw-text-primary);
    line-height: 1.35;
  }
  .legal-page-h2:first-of-type {
    margin-top: 0.25rem;
  }
  .legal-page-p {
    margin: 0 0 0.75rem;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--ccw-text-secondary);
  }
</style>
