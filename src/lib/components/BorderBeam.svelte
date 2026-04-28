<script>
  /**
   * 与 [border-beam-vue](https://github.com/mooniitt/border-beam-vue) 同源的流光边框效果，
   * 样式由 vendored `generateBeamCSS` 生成（Svelte 包装层）。
   */
  import { onMount, untrack } from 'svelte';
  import { browser } from '$app/environment';
  import { generateBeamCSS, sizePresets, sizeThemePresets } from '$lib/border-beam/styles.ts';

  let {
    size = 'md',
    colorVariant = 'colorful',
    theme = 'dark',
    staticColors = false,
    active = true,
    brightness = 1.3,
    hueRange = 30,
    strength = 1,
    borderRadius: borderRadiusProp = undefined,
    duration: durationProp = undefined,
    saturation: saturationProp = undefined,
    style: styleProp = {},
    children,
  } = $props();

  const beamId = `v-bb-${Math.random().toString(36).slice(2, 11)}`;

  let containerEl = $state(/** @type {HTMLElement | null} */ (null));
  let detectedRadius = $state(/** @type {number | null} */ (null));
  let systemTheme = $state(/** @type {'dark' | 'light'} */ ('dark'));
  let isActive = $state(untrack(() => active));
  let isFading = $state(false);

  /** @param {import('$lib/border-beam/types.ts').BorderBeamTheme} themeMode */
  function resolveTheme(themeMode, sys) {
    return themeMode === 'auto' ? sys : themeMode;
  }

  const resolvedTheme = $derived(resolveTheme(theme, systemTheme));
  const themeConfig = $derived(sizeThemePresets[size][resolvedTheme]);
  const sizeConfig = $derived(sizePresets[size]);

  const finalBorderRadius = $derived(
    borderRadiusProp ?? detectedRadius ?? sizeConfig.borderRadius,
  );
  const finalDuration = $derived(durationProp ?? (size === 'line' ? 2.4 : 1.96));
  const finalSaturation = $derived(saturationProp ?? themeConfig.saturation);
  const finalHueRange = $derived(size === 'line' ? Math.min(hueRange, 13) : hueRange);
  const finalStaticColors = $derived(colorVariant === 'mono' ? true : staticColors);

  const cssStyles = $derived(
    generateBeamCSS({
      id: beamId,
      borderRadius: finalBorderRadius,
      borderWidth: sizeConfig.borderWidth,
      duration: finalDuration,
      strokeOpacity: themeConfig.strokeOpacity,
      innerOpacity: themeConfig.innerOpacity,
      bloomOpacity: themeConfig.bloomOpacity,
      innerShadow: themeConfig.innerShadow,
      size,
      colorVariant,
      staticColors: finalStaticColors,
      brightness,
      saturation: finalSaturation,
      hueRange: finalHueRange,
      theme: resolvedTheme,
    }),
  );

  const mergedStyle = $derived({
    ...styleProp,
    borderRadius: `${finalBorderRadius}px`,
    '--beam-strength': Math.max(0, Math.min(1, strength)),
  });

  $effect(() => {
    if (active && !isActive && !isFading) {
      isActive = true;
    } else if (!active && isActive && !isFading) {
      isFading = true;
    }
  });

  /** @param {AnimationEvent} e */
  function handleAnimationEnd(e) {
    const name = e.animationName;
    if (name.includes('fade-out')) {
      isActive = false;
      isFading = false;
    }
  }

  onMount(() => {
    if (!browser) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    systemTheme = mq.matches ? 'dark' : 'light';
    const handler = (/** @type {MediaQueryListEvent} */ ev) => {
      systemTheme = ev.matches ? 'dark' : 'light';
    };
    mq.addEventListener('change', handler);

    let observer = /** @type {MutationObserver | null} */ (null);
    if (borderRadiusProp == null && containerEl) {
      const detect = () => {
        const child = containerEl?.firstElementChild;
        if (!child || !(child instanceof HTMLElement)) return;
        const cs = window.getComputedStyle(child);
        const raw = parseFloat(cs.borderTopLeftRadius);
        if (!Number.isNaN(raw) && raw > 0) detectedRadius = raw;
      };
      detect();
      observer = new MutationObserver(detect);
      observer.observe(containerEl, { childList: true, subtree: false });
    }

    return () => {
      mq.removeEventListener('change', handler);
      observer?.disconnect();
    };
  });
</script>

{#if cssStyles}
  <svelte:element this={'style'}>{cssStyles}</svelte:element>
{/if}
<div
  bind:this={containerEl}
  class="border-beam-wrap"
  style={mergedStyle}
  data-beam={beamId}
  data-active={isActive && !isFading ? '' : undefined}
  data-fading={isFading ? '' : undefined}
  onanimationend={handleAnimationEnd}
>
  {@render children?.()}
  <div data-beam-bloom></div>
</div>

<style>
  .border-beam-wrap {
    display: inline-block;
    max-width: 100%;
  }
</style>
