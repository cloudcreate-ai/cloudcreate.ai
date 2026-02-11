<script>
  import { t } from '$lib/i18n.js';
  import { aiPanelOpen } from '$lib/stores/layoutStore.js';
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
      <p class="ai-panel-placeholder">{t('layout.aiChatPlaceholder')}</p>
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
  /* 与侧栏、工作区标题对齐（0.5rem） */
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
    background: rgba(255, 255, 255, 0.05);
  }
  .ai-panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    background: var(--ccw-bg-elevated);
  }
  .ai-panel-placeholder {
    font-size: 0.8125rem;
    color: var(--ccw-text-muted);
    margin: 0;
    line-height: 1.5;
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
    background: rgba(255, 255, 255, 0.05);
    color: var(--ccw-accent);
  }
</style>
