<script>
  import { t } from '$lib/i18n.js';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import WorkspacePageShell from '$lib/components/layout/WorkspacePageShell.svelte';

  /** 线上体验（SBTI for AI 问卷 / 提示词） */
  const AITI_LIVE_URL = 'https://thedecklab.com/aiti';
  /** 开源仓库 */
  const AITI_REPO_URL = 'https://github.com/cloudcreate-ai/SBKPI';

  $effect(() => {
    return registerAgentPrompt({
      templateKey: 'agentPrompt.creativeAiti',
      getParams: () => ({ currentUrl: get(page).url.href }),
    });
  });
</script>

<WorkspacePageShell layout="operation" class="creative-aiti">
  <ToolPageHeader titleKey="creative.aitiTitle" descKey="creative.aitiDesc" />

  <p class="page-intro m-0 mb-4 text-sm text-surface-600-400">{t('creative.aitiIntro')}</p>

  <div class="flex flex-wrap gap-3 mb-5">
    <a
      class="btn preset-filled-primary-500"
      href={AITI_LIVE_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      {t('creative.aitiOpenSite')}
    </a>
    <a
      class="btn preset-outlined-surface-200-800"
      href={AITI_REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      {t('creative.aitiOpenGithub')}
    </a>
  </div>

  <section
    class="card preset-outlined-surface-200-800 p-4 creative-aiti-safety"
    aria-labelledby="aiti-safety-h"
  >
    <h2 id="aiti-safety-h" class="text-sm font-semibold m-0 mb-2 text-surface-800-100">
      {t('creative.aitiSafetyTitle')}
    </h2>
    <ul class="m-0 pl-4 text-sm text-surface-600-400 space-y-1.5 list-disc">
      <li>{t('creative.aitiSafety1')}</li>
      <li>{t('creative.aitiSafety2')}</li>
      <li>{t('creative.aitiSafety3')}</li>
    </ul>
  </section>
</WorkspacePageShell>

<style>
  :global(.creative-aiti .page-intro) {
    line-height: 1.55;
  }
  .creative-aiti-safety {
    width: 100%;
  }
</style>
