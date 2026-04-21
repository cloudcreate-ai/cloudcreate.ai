<script>
  import { t } from '$lib/i18n.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import WorkspacePageShell from '$lib/components/layout/WorkspacePageShell.svelte';
</script>

<WorkspacePageShell>
  <ToolPageHeader titleKey="creative.landingTitle" descKey="creative.landingDesc" />
  <p class="page-intro">{t('creative.landingHint')}</p>
</WorkspacePageShell>
