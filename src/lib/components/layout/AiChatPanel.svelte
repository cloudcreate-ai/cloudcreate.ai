<script>
  import { page } from '$app/stores';
  import { t, locale } from '$lib/i18n.js';
  import { aiPanelOpen } from '$lib/stores/layoutStore.js';
  import { agentPromptStore } from '$lib/stores/agentPromptStore.js';
  import { interpolateTemplate } from '$lib/agentPrompt/interpolate.js';
  import { getPanelPagePurpose } from '$lib/agentPrompt/panelPageBrief.js';
  import { resolveAgentPromptFallbackTemplateKey } from '$lib/agentPrompt/fallbackKey.js';
  import { getLogicalPath } from '$lib/localePath.js';

  let copied = $state(false);
  let copyTimer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);

  /** 与首页 home.title / home.subtitle 一致，供提示词前导与插值 */
  const sitePromptCtx = $derived.by(() => {
    void $locale;
    return {
      siteName: t('home.title'),
      siteTagline: t('home.subtitle'),
    };
  });

  const siteLeadInText = $derived.by(() => {
    void $locale;
    return interpolateTemplate(t('agentPrompt.siteLeadIn'), sitePromptCtx);
  });

  /** @param {string} pathname */
  function localePrefixFromPathname(pathname) {
    if (pathname.startsWith('/zh')) return '/zh';
    if (pathname.startsWith('/en')) return '/en';
    return '/en';
  }

  const specDocUrls = $derived.by(() => {
    const pathname = $page.url.pathname;
    const prefix = localePrefixFromPathname(pathname);
    const origin = $page.url.origin;
    const specPageUrl = `${origin}${prefix}/ai-spec`;
    const plainDocUrl = `${origin}${prefix}/ai-spec/llm.txt`;
    return { specPageUrl, plainDocUrl };
  });

  const compiledPrompt = $derived.by(() => {
    void $locale;
    const pathname = $page.url.pathname;
    const href = $page.url.href;
    const logical = getLogicalPath(pathname);
    const reg = $agentPromptStore;
    const base = { currentUrl: href, ...sitePromptCtx };
    const { plainDocUrl } = specDocUrls;
    const append = interpolateTemplate(t('agentPrompt.promptToolSpecAppend'), { plainDocUrl });
    let main = '';
    if (reg?.templateKey && typeof reg.getParams === 'function') {
      const raw = t(reg.templateKey);
      const p = { ...base, ...reg.getParams() };
      main = siteLeadInText + interpolateTemplate(raw, p);
    } else {
      const sub = resolveAgentPromptFallbackTemplateKey(logical, pathname);
      const raw = t(`agentPrompt.${sub}`);
      main = siteLeadInText + interpolateTemplate(raw, base);
    }
    return main + append;
  });

  const pageBriefText = $derived.by(() => {
    void $locale;
    void $agentPromptStore;
    const pathname = $page.url.pathname;
    const logical = getLogicalPath(pathname);
    const reg = $agentPromptStore;
    if (reg?.templateKey) {
      return getPanelPagePurpose(reg.templateKey, t);
    }
    const sub = resolveAgentPromptFallbackTemplateKey(logical, pathname);
    return getPanelPagePurpose(`agentPrompt.${sub}`, t);
  });

  const panelIntroPart12 = $derived.by(() => {
    void $locale;
    return interpolateTemplate(t('agentPrompt.panelIntroPart12'), {
      ...sitePromptCtx,
      pageBrief: pageBriefText,
    });
  });

  async function copyPrompt() {
    const text = compiledPrompt;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copied = false;
        copyTimer = null;
      }, 2000);
    } catch {
      copied = false;
    }
  }
</script>

{#if $aiPanelOpen}
  <aside class="ai-panel">
    <div class="ai-panel-header">
      <span class="ai-panel-title">{t('layout.aiChat')}</span>
      <button
        type="button"
        class="ai-panel-close"
        onclick={() => aiPanelOpen.set(false)}
        aria-label="Close"
      >
        ✕
      </button>
    </div>
    <div class="ai-panel-content">
      <div class="ai-panel-intro">
        <p class="ai-panel-intro-part12">{panelIntroPart12}</p>
        <p class="ai-panel-intro-part3">
          <span>{t('agentPrompt.specDetailLabel')}</span>
          <a
            class="ai-panel-spec-link"
            href={specDocUrls.specPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            >{t('agentPrompt.specLinkDetail')}</a
          >
        </p>
      </div>
      <div class="ai-panel-copy-wrap">
        <button
          type="button"
          class="btn preset-filled-primary-500 ai-panel-copy-btn"
          class:ai-panel-copy-btn--done={copied}
          onclick={() => copyPrompt()}
          aria-label={copied ? t('agentPrompt.copiedAfterPrompt') : t('agentPrompt.copy')}
        >
          {copied ? t('agentPrompt.copiedAfterPrompt') : t('agentPrompt.copy')}
        </button>
      </div>
      <textarea
        class="ai-panel-prompt"
        readonly
        rows="14"
        value={compiledPrompt}
        aria-label={t('layout.aiChat')}
      ></textarea>
    </div>
  </aside>
{:else}
  <div class="ai-panel-collapsed">
    <button
      type="button"
      class="ai-panel-expand"
      onclick={() => aiPanelOpen.set(true)}
      aria-label={t('layout.aiChat')}
      title={t('layout.aiChat')}
    >
      AI
    </button>
  </div>
{/if}

<style>
  .ai-panel {
    width: 280px;
    height: 100%;
    flex-shrink: 0;
    border-left: 1px solid var(--ccw-border-contrast);
    background: var(--ccw-bg-panel);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: var(--ccw-text-secondary);
  }
  .ai-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 600;
    border-bottom: 1px solid var(--ccw-border-contrast);
    flex-shrink: 0;
    color: var(--ccw-text-primary);
  }
  .ai-panel-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ai-panel-close {
    padding: 0.15rem 0.4rem;
    font-size: 0.75rem;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    color: var(--ccw-text-muted);
    border-radius: var(--ccw-radius-pill);
    transition: color 150ms ease, background-color 150ms ease, border-color 150ms ease;
  }
  .ai-panel-close:hover {
    color: var(--ccw-text-primary);
    border-color: var(--ccw-border-soft);
    background: color-mix(in oklab, var(--ccw-bg-elevated) 80%, transparent);
  }
  .ai-panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem;
    background: var(--ccw-bg-elevated);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 0;
  }
  .ai-panel-intro {
    font-size: 0.75rem;
    color: var(--ccw-text-muted);
    line-height: 1.45;
  }
  .ai-panel-intro-part12 {
    margin: 0 0 0.5rem;
    white-space: pre-line;
  }
  .ai-panel-intro-part3 {
    margin: 0;
    font-size: 0.75rem;
  }
  .ai-panel-spec-sep {
    color: var(--ccw-text-muted);
  }
  .ai-panel-spec-link {
    color: var(--ccw-accent);
    text-decoration: underline;
  }
  .ai-panel-spec-link:hover {
    color: var(--ccw-text-primary);
  }
  .ai-panel-copy-wrap {
    width: 100%;
    flex-shrink: 0;
  }
  .ai-panel-copy-btn {
    display: block;
    width: 100%;
    box-sizing: border-box;
    min-height: 2.25rem;
    padding: 0.45rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.3;
    text-align: center;
    white-space: normal;
    border-radius: var(--ccw-radius-button);
    transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease,
      box-shadow 150ms ease;
  }
  .ai-panel-copy-btn--done {
    box-shadow: 0 0 0 1px var(--ccw-border-contrast);
  }
  .ai-panel-prompt {
    width: 100%;
    flex: 1;
    min-height: 8rem;
    box-sizing: border-box;
    padding: 0.5rem 0.6rem;
    font-size: 0.7rem;
    line-height: 1.4;
    font-family: var(--ccw-font-mono, ui-monospace, monospace);
    color: var(--ccw-text-primary);
    background: var(--ccw-bg-base);
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    resize: vertical;
  }
  .ai-panel-prompt:focus {
    outline: 1px solid var(--ccw-border-contrast);
    outline-offset: 1px;
  }
  .ai-panel-collapsed {
    width: 36px;
    height: 100%;
    flex-shrink: 0;
    border-left: 1px solid var(--ccw-border-contrast);
    background: var(--ccw-bg-panel);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 0.5rem;
  }
  .ai-panel-expand {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
    padding: 0.5rem 0.25rem;
    font-size: 0.6875rem;
    font-weight: 600;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--ccw-text-muted);
    border-radius: 4px;
    transition: color 150ms ease, background-color 150ms ease;
  }
  .ai-panel-expand:hover {
    background: color-mix(in oklab, var(--ccw-bg-elevated) 60%, transparent);
    color: var(--ccw-accent);
  }
</style>
