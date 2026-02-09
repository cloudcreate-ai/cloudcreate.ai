<script>
  import { page } from '$app/stores';
  import { setLocale } from '$lib/i18n.js';
  import { browser } from '$app/environment';
  import { SUPPORTED_LOCALES } from '$lib/i18n.js';

  $effect(() => {
    if (!browser) return;
    const localeFromUrl = $page.params.locale;
    if (localeFromUrl && SUPPORTED_LOCALES.includes(localeFromUrl)) {
      setLocale(localeFromUrl);
    }
  });
</script>

<slot />
