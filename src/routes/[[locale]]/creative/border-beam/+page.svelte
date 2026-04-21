<script>
  import { t } from '$lib/i18n.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import WorkspacePageShell from '$lib/components/layout/WorkspacePageShell.svelte';
  import BorderBeam from '$lib/components/BorderBeam.svelte';
  import SliderWithInput from '$lib/components/common/SliderWithInput.svelte';

  /** @type {'sm' | 'md' | 'line'} */
  let beamSize = $state('md');
  /** @type {'colorful' | 'mono' | 'ocean' | 'sunset'} */
  let colorVariant = $state('colorful');
  /** @type {'dark' | 'light' | 'auto'} */
  let beamTheme = $state('dark');
  let strength = $state(1);

  const strengthPercent = $derived(Math.round(strength * 100));
</script>

<WorkspacePageShell wide={true} class="creative-border-beam">
  <ToolPageHeader titleKey="creative.borderBeamTitle" descKey="creative.borderBeamDesc" />

  <p class="page-intro">{t('creative.borderBeamNpmNote')}</p>

  <section class="card preset-outlined-surface-200-800 p-4 mb-4">
    <div class="flex flex-wrap gap-4 items-end">
      <div class="flex flex-col gap-0.5">
        <label for="beam-size" class="text-xs text-surface-600-400">{t('creative.controlSize')}</label>
        <select id="beam-size" bind:value={beamSize} class="select preset-outlined-surface-200-800 min-w-36">
          <option value="sm">{t('creative.sizeSm')}</option>
          <option value="md">{t('creative.sizeMd')}</option>
          <option value="line">{t('creative.sizeLine')}</option>
        </select>
      </div>
      <div class="flex flex-col gap-0.5">
        <label for="beam-variant" class="text-xs text-surface-600-400">{t('creative.controlVariant')}</label>
        <select id="beam-variant" bind:value={colorVariant} class="select preset-outlined-surface-200-800 min-w-36">
          <option value="colorful">{t('creative.variantColorful')}</option>
          <option value="mono">{t('creative.variantMono')}</option>
          <option value="ocean">{t('creative.variantOcean')}</option>
          <option value="sunset">{t('creative.variantSunset')}</option>
        </select>
      </div>
      <div class="flex flex-col gap-0.5">
        <label for="beam-theme" class="text-xs text-surface-600-400">{t('creative.controlTheme')}</label>
        <select id="beam-theme" bind:value={beamTheme} class="select preset-outlined-surface-200-800 min-w-32">
          <option value="dark">{t('creative.themeDark')}</option>
          <option value="light">{t('creative.themeLight')}</option>
          <option value="auto">{t('creative.themeAuto')}</option>
        </select>
      </div>
      <div class="flex flex-col gap-0.5 flex-1 min-w-[min(100%,220px)]">
        <label for="beam-strength" class="text-xs text-surface-600-400">
          {t('creative.controlStrength')} ({strengthPercent}%)
        </label>
        <SliderWithInput
          id="beam-strength"
          value={strengthPercent}
          min={0}
          max={100}
          step={5}
          oninput={(v) => (strength = v / 100)}
          inputWidth="64px"
        />
      </div>
    </div>
  </section>

  <section class="mb-4 flex justify-center py-6">
    <BorderBeam size={beamSize} {colorVariant} theme={beamTheme} {strength}>
      <div class="beam-demo-card">
        <p class="beam-demo-text m-0">{t('creative.demoCardText')}</p>
      </div>
    </BorderBeam>
  </section>

  <section class="mb-4 text-sm text-surface-600-400">
    <p class="m-0">
      <a
        href="https://github.com/mooniitt/border-beam-vue"
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary-500 hover:underline"
      >
        {t('creative.borderBeamGithub')}
      </a>
    </p>
  </section>
</WorkspacePageShell>

<style>
  .beam-demo-card {
    box-sizing: border-box;
    min-width: min(100%, 320px);
    padding: 2rem 2.5rem;
    border-radius: 16px;
    background: var(--ccw-bg-elevated);
    border: 1px solid var(--ccw-border-soft);
  }
  .beam-demo-text {
    font-size: 1rem;
    color: var(--ccw-text-secondary);
    text-align: center;
  }
</style>
