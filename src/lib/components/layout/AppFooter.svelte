<script>
  import { t } from '$lib/i18n.js';
</script>

<footer class="app-footer">
  <span class="app-footer-brand">{t('home.title')}</span>
  <span class="app-footer-sep" aria-hidden="true">·</span>
  <span class="app-footer-tagline">{t('home.subtitle')}</span>
</footer>

<style>
  .app-footer {
    min-height: 1.75rem;
    padding: 0.35rem 1rem;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem;
    flex-shrink: 0;
    border-top: 1px solid var(--ccw-border-contrast);
    background: var(--ccw-bg-panel);
    font-size: 0.75rem;
    color: var(--ccw-text-muted);
  }
  .app-footer-brand {
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--ccw-text-secondary);
  }
  .app-footer-sep {
    opacity: 0.45;
    user-select: none;
  }
  .app-footer-tagline {
    letter-spacing: 0.01em;
  }
</style>
