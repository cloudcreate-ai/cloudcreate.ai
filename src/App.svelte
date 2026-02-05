<script>
  import Router from 'svelte-spa-router';
  import { locale } from './lib/i18n.js';
  import Workspace from './routes/Workspace.svelte';
  import ImageCompress from './routes/ImageCompress.svelte';
  import ImageConvert from './routes/ImageConvert.svelte';
  import ImageCrop from './routes/ImageCrop.svelte';

  const routes = {
    '/': Workspace,
    '/image/compress': ImageCompress,
    '/image/convert': ImageConvert,
    '/image/crop': ImageCrop,
  };
</script>

{#key $locale}
  <Router {routes} />
{/key}
