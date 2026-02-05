<script>
  import { link } from 'svelte-spa-router';

  const tools = [
    {
      id: 'image',
      title: 'Image Tool',
      description: 'Compress images and convert formats (JPEG, PNG, WebP, AVIF). Batch processing supported.',
      href: '/image',
      icon: '🖼️',
    },
  ];
</script>

<main class="workspace">
  <header>
    <h1>FreeTools</h1>
    <p class="subtitle">Browser-based utility collection</p>
  </header>

  <section class="tool-grid">
    {#each tools as tool}
      <a href={tool.href} use:link class="tool-card">
        <span class="icon">{tool.icon}</span>
        <h2>{tool.title}</h2>
        <p>{tool.description}</p>
      </a>
    {/each}
  </section>
</main>

<style>
  .workspace {
    padding: 2rem;
    max-width: 960px;
    margin: 0 auto;
  }

  header {
    margin-bottom: 2.5rem;
    text-align: center;
  }

  h1 {
    font-size: 2rem;
    margin: 0 0 0.25rem 0;
    font-weight: 600;
  }

  .subtitle {
    color: var(--text-muted);
    margin: 0;
    font-size: 0.95rem;
  }

  .tool-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1.25rem;
  }

  .tool-card {
    display: block;
    padding: 1.5rem;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .tool-card:hover {
    border-color: var(--accent);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .icon {
    font-size: 2rem;
    display: block;
    margin-bottom: 0.75rem;
  }

  .tool-card h2 {
    font-size: 1.1rem;
    margin: 0 0 0.5rem 0;
    font-weight: 600;
  }

  .tool-card p {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.45;
  }
</style>
