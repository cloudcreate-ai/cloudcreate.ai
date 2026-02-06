<script>
  import Router from 'svelte-spa-router';
  import { locale } from './lib/i18n.js';
  import Workspace from './routes/Workspace.svelte';
  import ImageCompress from './routes/ImageCompress.svelte';
  import ImageCrop from './routes/ImageCrop.svelte';
  import ImageResize from './routes/ImageResize.svelte';

  const routes = {
    '/': Workspace,
    '/image/compress': ImageCompress,
    '/image/crop': ImageCrop,
    '/image/resize': ImageResize,
  };
</script>

{#key $locale}
  <Router {routes} />
{/key}
