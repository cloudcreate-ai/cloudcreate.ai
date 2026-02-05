<script>
  import Router from 'svelte-spa-router';
  import Workspace from './routes/Workspace.svelte';
  import ImageTool from './routes/ImageTool.svelte';

  const routes = {
    '/': Workspace,
    '/image': ImageTool,
  };
</script>

<Router {routes} />
