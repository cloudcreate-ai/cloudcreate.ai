<script>
  import { page } from '$app/stores';
  import { t } from '$lib/i18n.js';
  import { localePath } from '$lib/localePath.js';
  import { siteContactEmail, siteGithubUrl } from '$lib/siteConfig.js';
</script>

<footer class="app-footer">
  <div class="app-footer-left">
    <span class="app-footer-brand-row">
      <img
        src="/cloudcreate-rounded-bg.png"
        class="app-footer-site-logo"
        width="16"
        height="16"
        alt=""
        decoding="async"
      />
      <span class="app-footer-brand">{t('home.title')}</span>
    </span>
    <span class="app-footer-sep" aria-hidden="true">·</span>
    <span class="app-footer-tagline">{t('home.subtitle')}</span>
  </div>
  <nav class="app-footer-legal" aria-label={t('layout.footerLegalNav')}>
    <a class="app-footer-link" href={localePath($page.url.pathname, '/privacy')}>{t('legal.privacyTitle')}</a>
    <span class="app-footer-sep" aria-hidden="true">·</span>
    <a class="app-footer-link" href={localePath($page.url.pathname, '/terms')}>{t('legal.termsTitle')}</a>
    <span class="app-footer-sep" aria-hidden="true">·</span>
    <a
      class="app-footer-link"
      href={siteGithubUrl}
      target="_blank"
      rel="noreferrer"
      title={t('layout.footerGithubTitle')}
      >GitHub</a
    >
    <span class="app-footer-sep" aria-hidden="true">·</span>
    <a
      class="app-footer-link"
      href={'mailto:' + siteContactEmail}
      title={t('layout.footerContactTitle')}
      >{siteContactEmail}</a
    >
  </nav>
</footer>

<style>
  .app-footer {
    min-height: 1.75rem;
    padding: 0.35rem 1rem;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem 0.75rem;
    flex-shrink: 0;
    border-top: 1px solid var(--ccw-border-contrast);
    background: var(--ccw-bg-panel);
    font-size: 0.75rem;
    color: var(--ccw-text-muted);
  }
  .app-footer-left {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 0;
  }
  .app-footer-legal {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-left: auto;
  }
  .app-footer-brand-row {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
  .app-footer-site-logo {
    display: block;
    flex-shrink: 0;
    width: 0.95rem;
    height: 0.95rem;
    border-radius: 0.22rem;
    opacity: 0.9;
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
  .app-footer-link {
    color: var(--ccw-text-muted);
    text-decoration: none;
  }
  .app-footer-link:hover {
    color: var(--ccw-accent);
    text-decoration: underline;
  }
</style>
