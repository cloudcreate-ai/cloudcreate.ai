<script>
  import { t } from '$lib/i18n.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import ProgressBar from '$lib/components/common/ProgressBar.svelte';

  let controlZoom = $state(1);
</script>

<div class="workspace-content workspace-content-wide styleguide">
  <ToolPageHeader titleKey="styleGuide.title" descKey="styleGuide.desc" />

  <p class="intro">{t('styleGuide.intro')}</p>

  <section class="card section">
    <h3>{t('styleGuide.sectionButtons')}</h3>
    <div class="btn-grid">
      <button class="btn preset-filled-primary-500">{t('styleGuide.primaryButton')}</button>
      <button class="btn preset-outlined-surface-200-800">{t('styleGuide.outlinedButton')}</button>
      <button class="btn btn-ghost">{t('styleGuide.ghostButton')}</button>
      <button class="btn preset-filled-primary-500" disabled>{t('styleGuide.disabledButton')}</button>
    </div>
  </section>

  <section class="card section">
    <h3>{t('styleGuide.sectionUtility')}</h3>
    <div class="utility-grid">
      <div>
        <p class="label">{t('styleGuide.controlButtons')}</p>
        <div class="control-row">
          <button class="control-btn" onclick={() => (controlZoom = Math.min(3, controlZoom + 0.1))}>
            {t('styleGuide.zoomIn')}
          </button>
          <button class="control-btn" onclick={() => (controlZoom = Math.max(0.25, controlZoom - 0.1))}>
            {t('styleGuide.zoomOut')}
          </button>
          <button class="control-btn" onclick={() => (controlZoom = 1)}>
            {t('styleGuide.resetView')}
          </button>
          <span class="control-value">{Math.round(controlZoom * 100)}%</span>
        </div>
      </div>
      <div>
        <p class="label">{t('styleGuide.sectionProgress')}</p>
        <ProgressBar indeterminate label={t('styleGuide.progressLabel')} />
      </div>
    </div>
  </section>

  <section class="card section">
    <h3>{t('styleGuide.sectionCards')}</h3>
    <div class="cards-demo">
      <div class="card demo-card">
        <h4>Card</h4>
        <p>使用 .card + 统一 padding。</p>
      </div>
      <div class="card drop-zone-demo">
        <p class="label">{t('styleGuide.dropZoneTitle')}</p>
        <div class="drop-zone">
          <p class="hint">{t('styleGuide.dropZoneHint')}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="card section">
    <h3>{t('styleGuide.sectionNotes')}</h3>
    <ul class="notes">
      <li>{t('styleGuide.note1')}</li>
      <li>{t('styleGuide.note2')}</li>
      <li>{t('styleGuide.note3')}</li>
    </ul>
  </section>
</div>

<style>
  .styleguide .intro {
    margin: 0 0 1.5rem 0;
    color: var(--ccw-text-muted);
  }
  .section {
    margin-bottom: 1.25rem;
  }
  .section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 0.95rem;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: var(--ccw-text-secondary);
  }
  .btn-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .utility-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
  .label {
    margin: 0 0 0.5rem 0;
    font-size: 0.8rem;
    color: var(--ccw-text-muted);
  }
  .control-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  .control-value {
    font-size: 0.85rem;
    color: var(--ccw-text-primary);
  }
  .cards-demo {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
  .demo-card {
    padding: 1rem;
  }
  .drop-zone-demo {
    padding: 1rem;
  }
  .drop-zone {
    border: 1px dashed var(--ccw-border-contrast);
    border-radius: var(--ccw-radius-card);
    padding: 1rem;
    text-align: center;
    background: rgba(255, 255, 255, 0.02);
  }
  .drop-zone .hint {
    margin: 0;
    color: var(--ccw-text-secondary);
    font-size: 0.85rem;
  }
  .notes {
    margin: 0;
    padding-left: 1.1rem;
    color: var(--ccw-text-secondary);
  }
  .notes li {
    margin-bottom: 0.4rem;
  }
</style>
