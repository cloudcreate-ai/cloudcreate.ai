<script>
  /**
   * 全站 head：title、description、canonical、Open Graph、Twitter Card
   * 文案语言以 URL 中的 [[locale]] 为准，保证预渲染与浏览器一致。
   */
  import { page } from '$app/stores';
  import { tLang } from '$lib/i18n.js';
  import { getLogicalPath } from '$lib/localePath.js';
  import { resolveSeo, buildSeoTexts } from '$lib/seoMeta.js';
  import { getRouteStructuredData } from '$lib/seoStructuredData.js';
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
  const ogImage = $derived(`${siteOrigin}/cloudcreate-rounded-bg.png`);
  const logicalPath = $derived(getLogicalPath($page.url.pathname));

  const orgSchema = $derived.by(() =>
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteBrand,
      url: siteOrigin,
      logo: `${siteOrigin}/android-chrome-512x512.png`,
    })
  );

  const websiteSchema = $derived.by(() =>
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteBrand,
      url: siteOrigin,
      inLanguage: lang === 'zh' ? 'zh-CN' : 'en',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteOrigin}/${lang}?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    })
  );

  const pageSchemas = $derived.by(() => {
    const pageUrl = canonicalUrl;
    const pageLang = lang === 'zh' ? 'zh-CN' : 'en';
    const title = texts.title;
    const desc = texts.description;
    const p = logicalPath;

    /** @type {Array<Record<string, unknown>>} */
    const schemas = [];

    const isToolLike =
      p === '/tools' ||
      p === '/table' ||
      p.startsWith('/image/') ||
      p.startsWith('/pdf') ||
      p.startsWith('/css') ||
      p.startsWith('/archive') ||
      p.startsWith('/workflow') ||
      p.startsWith('/markdown') ||
      p.startsWith('/remove-watermark');

    if (isToolLike) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: title,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        description: desc,
        url: pageUrl,
        inLanguage: pageLang,
        publisher: {
          '@type': 'Organization',
          name: siteBrand,
          url: siteOrigin,
        },
      });
    } else {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description: desc,
        url: pageUrl,
        inLanguage: pageLang,
        isPartOf: {
          '@type': 'WebSite',
          name: siteBrand,
          url: siteOrigin,
        },
      });
    }

    if (p === '/ai-spec' || p === '/ai-spec/llm' || p === '/ai-spec/llm.txt') {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: title,
        description: desc,
        url: pageUrl,
        inLanguage: pageLang,
        author: { '@type': 'Organization', name: siteBrand },
        publisher: {
          '@type': 'Organization',
          name: siteBrand,
          url: siteOrigin,
        },
      });
    }

    schemas.push(...getRouteStructuredData(p, lang));

    return schemas.map((s) => JSON.stringify(s));
  });
</script>

<svelte:head>
  <title>{texts.title}</title>
  <meta name="description" content={texts.description} />
  <link rel="canonical" href={canonicalUrl} />
  <link rel="alternate" hreflang="en" href={urlEn} />
  <link rel="alternate" hreflang="zh-CN" href={urlZh} />
  <link rel="alternate" hreflang="x-default" href={urlEn} />
  <meta
    name="robots"
    content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
  />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content={siteBrand} />
  <meta property="og:locale" content={ogLocale} />
  <meta property="og:title" content={texts.title} />
  <meta property="og:description" content={texts.description} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content={ogImage} />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={texts.title} />
  <meta name="twitter:description" content={texts.description} />
  <meta name="twitter:image" content={ogImage} />
  <script type="application/ld+json">{orgSchema}</script>
  <script type="application/ld+json">{websiteSchema}</script>
  {#each pageSchemas as schema}
    <script type="application/ld+json">{schema}</script>
  {/each}
</svelte:head>
