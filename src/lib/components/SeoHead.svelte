<script>
  /**
   * 全站 head：title、description、canonical、Open Graph、Twitter Card
   * 文案语言以 URL 中的 [[locale]] 为准，保证预渲染与浏览器一致。
   */
  import { page } from '$app/stores';
  import { tLang } from '$lib/i18n.js';
  import { getLogicalPath } from '$lib/localePath.js';
  import { resolveSeo, buildSeoTexts } from '$lib/seoMeta.js';
  import { siteOrigin } from '$lib/siteConfig.js';

  const lang = $derived($page.params.locale === 'zh' ? 'zh' : 'en');

  const texts = $derived.by(() => {
    const spec = resolveSeo(getLogicalPath($page.url.pathname));
    return buildSeoTexts(spec, (key) => tLang(lang, key));
  });

  const canonicalUrl = $derived(`${siteOrigin}${$page.url.pathname}`);

  /** 不含语言前缀的路径段，用于 en/zh 成对 alternate */
  const pathSuffix = $derived.by(() => {
    const logical = getLogicalPath($page.url.pathname);
    return logical === '/' ? '' : logical;
  });
  const urlEn = $derived(`${siteOrigin}/en${pathSuffix}`);
  const urlZh = $derived(`${siteOrigin}/zh${pathSuffix}`);

  const ogLocale = $derived($page.url.pathname.startsWith('/zh') ? 'zh_CN' : 'en_US');

  const siteBrand = $derived(tLang(lang, 'seo.siteBrand'));
</script>

<svelte:head>
  <title>{texts.title}</title>
  <meta name="description" content={texts.description} />
  <link rel="canonical" href={canonicalUrl} />
  <link rel="alternate" hreflang="en" href={urlEn} />
  <link rel="alternate" hreflang="zh-CN" href={urlZh} />
  <link rel="alternate" hreflang="x-default" href={urlEn} />
  <meta name="robots" content="index, follow" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content={siteBrand} />
  <meta property="og:locale" content={ogLocale} />
  <meta property="og:title" content={texts.title} />
  <meta property="og:description" content={texts.description} />
  <meta property="og:url" content={canonicalUrl} />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={texts.title} />
  <meta name="twitter:description" content={texts.description} />
</svelte:head>
