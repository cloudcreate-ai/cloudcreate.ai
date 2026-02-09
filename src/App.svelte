<script>
  import Router from 'svelte-spa-router';
  import { locale } from './lib/i18n.js';
  import Workspace from './routes/Workspace.svelte';
  import ImageCompress from './routes/ImageCompress.svelte';
  import ImageCrop from './routes/ImageCrop.svelte';
  import ImageResize from './routes/ImageResize.svelte';
  import FaviconGenerator from './routes/FaviconGenerator.svelte';
  import ImageRotate from './routes/ImageRotate.svelte';
  import WorkflowEditor from './routes/WorkflowEditor.svelte';
  import WorkflowEditorAdvanced from './routes/WorkflowEditorAdvanced.svelte';

  const routes = {
    '/': Workspace,
    '/workflow/advanced': WorkflowEditorAdvanced,
    '/workflow': WorkflowEditor,
    '/image/compress': ImageCompress,
    '/image/crop': ImageCrop,
    '/image/resize': ImageResize,
    '/image/favicon': FaviconGenerator,
    '/image/rotate': ImageRotate,
  };
</script>

{#key $locale}
  <Router {routes} />
{/key}
