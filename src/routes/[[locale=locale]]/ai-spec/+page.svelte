<script>
  import { t } from '$lib/i18n.js';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';
  import WorkspacePageShell from '$lib/components/layout/WorkspacePageShell.svelte';
  import { TOOL_PAGE_SPECS, specIdToAnchor } from '$lib/toolPageSpec/registry.js';
  import { buildFullPagePlainText, buildSpecSectionPlainText } from '$lib/toolPageSpec/markdown.js';
  import { localePath } from '$lib/localePath.js';

  let pageCopied = $state(false);
  let sectionCopiedId = $state(/** @type {string | null} */ (null));
  let pageCopyTimer = $state(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  let sectionCopyTimer = $state(/** @type {ReturnType<typeof setTimeout> | null} */ (null));

  $effect(() => {
    return registerAgentPrompt({
      templateKey: 'agentPrompt.aiSpecPageDoc',
      getParams: () => ({ currentUrl: get(page).url.href }),
    });
  });

  /**
   * @param {import('$lib/toolPageSpec/registry.js').ToolPageSpec} spec
   */
  function toolTitle(spec) {
    return t(spec.titleKey);
  }

  const fullPagePlain = $derived(buildFullPagePlainText(t));
  const specPageHref = $derived(
    `${$page.url.origin}${localePath($page.url.pathname, '/ai-spec')}`
  );

  /**
   * @param {import('$lib/toolPageSpec/registry.js').ToolPageSpec} spec
   */
  function sectionPlain(spec) {
    return buildSpecSectionPlainText(t, spec);
  }

  /**
   * @param {string} text
   * @param {'page' | string} which
   */
  async function copyText(text, which) {
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'page') {
        pageCopied = true;
        if (pageCopyTimer) clearTimeout(pageCopyTimer);
        pageCopyTimer = setTimeout(() => {
          pageCopied = false;
          pageCopyTimer = null;
        }, 2000);
      } else {
        sectionCopiedId = which;
        if (sectionCopyTimer) clearTimeout(sectionCopyTimer);
        sectionCopyTimer = setTimeout(() => {
          sectionCopiedId = null;
          sectionCopyTimer = null;
        }, 2000);
      }
    } catch {
      if (which === 'page') pageCopied = false;
      else sectionCopiedId = null;
    }
  }

  /**
   * @param {import('$lib/toolPageSpec/registry.js').ToolPageSpec} spec
   */
  function purposeLine(spec) {
    const pKey = `agentPrompt.panelBrief.${spec.id}`;
    const pRaw = t(pKey);
    return pRaw === pKey ? t('agentPrompt.panelBrief._fallback') : pRaw;
  }
</script>

<WorkspacePageShell layout="content" class="ai-spec-page">
    <section class="ai-spec-human card preset-outlined-surface-200-800 workspace-content-block p-4 mb-2">
      <h1 class="text-xl font-semibold mt-0 mb-2 text-[color:var(--ccw-text-primary)]">
        {t('agentPrompt.aiSpecPage.pageTitle')}
      </h1>
      <p class="text-sm m-0 mb-2 text-[color:var(--ccw-text-secondary)]">
        <span>{t('agentPrompt.aiSpecPage.introLinkLead')}</span>
        <a class="ai-spec-toplink" href={specPageHref} target="_blank" rel="noopener noreferrer"
          >{t('agentPrompt.specLinkDetail')}</a
        >
      </p>
      <p class="text-surface-600-400 text-sm m-0 mb-4">{t('agentPrompt.aiSpecPage.pageIntro')}</p>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="btn preset-filled-primary-500"
          onclick={() => copyText(fullPagePlain, 'page')}
          aria-label={t('agentPrompt.aiSpecPage.copyPage')}
        >
          {pageCopied ? t('agentPrompt.aiSpecPage.copied') : t('agentPrompt.aiSpecPage.copyPage')}
        </button>
      </div>
    </section>

    {#each TOOL_PAGE_SPECS as spec (spec.id)}
      <section
        class="card preset-outlined-surface-200-800 workspace-content-block p-4 scroll-mt-4"
        id={specIdToAnchor(spec.id)}
      >
        <h2 class="text-lg font-semibold mt-0 mb-2 text-[color:var(--ccw-text-primary)]">{toolTitle(spec)}</h2>
        <p class="text-sm m-0 mb-3 text-[color:var(--ccw-text-secondary)]">
          <span class="font-medium">{t('agentPrompt.aiSpecPage.purposeLabel')}:</span>
          {purposeLine(spec)}
        </p>
        <div class="text-sm space-y-2 text-[color:var(--ccw-text-secondary)] mb-3">
          <p class="m-0">
            <span class="font-medium text-[color:var(--ccw-text-primary)]"
              >{t('agentPrompt.aiSpecPage.interpolateLabel')}:</span
            >
            {t(`agentPrompt.toolSpecDetail.${spec.id}.interpolate`)}
          </p>
          <p class="m-0">
            <span class="font-medium text-[color:var(--ccw-text-primary)]"
              >{t('agentPrompt.aiSpecPage.urlQueryLabel')}:</span
            >
            {t(`agentPrompt.toolSpecDetail.${spec.id}.urlQuery`)}
          </p>
        </div>
        <button
          type="button"
          class="btn btn-sm preset-outlined-surface-200-800"
          onclick={() => copyText(sectionPlain(spec), spec.id)}
        >
          {sectionCopiedId === spec.id
            ? t('agentPrompt.aiSpecPage.copied')
            : t('agentPrompt.aiSpecPage.copySection')}
        </button>
      </section>
    {/each}
</WorkspacePageShell>

<style>
  :global(.ai-spec-page .card) {
    border-radius: var(--ccw-radius-card);
  }
  :global(.ai-spec-page .ai-spec-human) {
    border-radius: var(--ccw-radius-card);
  }
  .ai-spec-toplink {
    color: var(--ccw-accent);
    text-decoration: underline;
  }
  .ai-spec-toplink:hover {
    color: var(--ccw-text-primary);
  }
</style>
