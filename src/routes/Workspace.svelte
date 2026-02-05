<script>
  import { link } from 'svelte-spa-router';

  const tools = [
    {
      id: 'compress',
      title: 'Image Compress',
      description: 'Reduce file size while keeping the same format. Quality adjustable. Batch supported.',
      href: '/image/compress',
      icon: '🗜️',
    },
    {
      id: 'convert',
      title: 'Image Format Convert',
      description: 'Convert between JPEG, PNG, WebP, AVIF. Batch supported.',
      href: '/image/convert',
      icon: '🔄',
    },
  ];
</script>

<main class="p-8 max-w-4xl mx-auto">
  <header class="mb-10 text-center">
    <h1 class="text-3xl font-semibold mb-1">FreeTools</h1>
    <p class="text-surface-600-400 text-sm">Browser-based utility collection</p>
  </header>

  <section class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
    {#each tools as tool}
      <a
        href={tool.href}
        use:link
        class="card preset-outlined-surface-200-800 block p-6 no-underline text-inherit transition hover:brightness-95 dark:hover:brightness-110"
      >
        <span class="text-3xl block mb-3">{tool.icon}</span>
        <h2 class="text-lg font-semibold mb-2">{tool.title}</h2>
        <p class="text-sm text-surface-600-400 leading-relaxed m-0">{tool.description}</p>
      </a>
    {/each}
  </section>
</main>
