<script>
  import Router from 'svelte-spa-router';
  import Workspace from './routes/Workspace.svelte';
  import ImageCompress from './routes/ImageCompress.svelte';
  import ImageConvert from './routes/ImageConvert.svelte';

  const routes = {
    '/': Workspace,
    '/image/compress': ImageCompress,
    '/image/convert': ImageConvert,
  };
</script>

<Router {routes} />
