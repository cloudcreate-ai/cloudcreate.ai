<script>
  import { link } from 'svelte-spa-router';
  import { fileToImageData, encodeImage, ENCODE_FORMATS } from '../lib/imageProcessor.js';

  let files = $state([]);
  let quality = $state(75);
  let targetFormat = $state('jpeg');
  let processing = $state(false);
  let results = $state([]);
  let error = $state('');

  let inputRef;

  async function processFiles() {
    if (files.length === 0) {
      error = 'Please select at least one image.';
      return;
    }
    error = '';
    processing = true;
    results = [];

    for (const file of files) {
      try {
        const imageData = await fileToImageData(file);
        const { buffer, mime, ext } = await encodeImage(imageData, targetFormat, quality);
        const blob = new Blob([buffer], { type: mime });
        const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
        results = [...results, { name, blob, originalSize: file.size, newSize: blob.size }];
      } catch (e) {
        results = [...results, { name: file.name, error: e.message }];
      }
    }
    processing = false;
  }

  function handleInput(e) {
    const list = e.target.files;
    files = list ? Array.from(list) : [];
    results = [];
    error = '';
  }

  function download(result) {
    if (result.error) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(result.blob);
    a.download = result.name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function downloadAll() {
    results.filter((r) => !r.error).forEach((r) => download(r));
  }

  function clear() {
    files = [];
    results = [];
    error = '';
    if (inputRef) inputRef.value = '';
  }
</script>

<main class="image-tool">
  <header class="tool-header">
    <a href="/" use:link class="back">← Workspace</a>
    <h1>Image Tool</h1>
    <p>Compress and convert images. Supports batch processing.</p>
  </header>

  <section class="config">
    <div class="field">
      <label for="format">Output format</label>
      <select id="format" bind:value={targetFormat}>
        {#each ENCODE_FORMATS as fmt}
          <option value={fmt}>{fmt.toUpperCase()}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="quality">Quality {quality}</label>
      <input id="quality" type="range" min="1" max="100" bind:value={quality} />
    </div>
  </section>

  <section class="upload">
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp,image/avif"
      multiple
      onchange={handleInput}
      bind:this={inputRef}
    />
    <p class="hint">{files.length} file(s) selected</p>
    {#if error}
      <p class="error">{error}</p>
    {/if}
  </section>

  <section class="actions">
    <button onclick={processFiles} disabled={processing || files.length === 0}>
      {processing ? 'Processing...' : 'Process'}
    </button>
    <button onclick={clear} class="secondary">Clear</button>
  </section>

  {#if results.length > 0}
    <section class="results">
      <div class="results-header">
        <h2>Results</h2>
        <button onclick={downloadAll} class="secondary">Download All</button>
      </div>
      <ul>
        {#each results as result}
          <li>
            <span class="name">{result.name}</span>
            {#if result.error}
              <span class="err">{result.error}</span>
            {:else}
              <span class="size">
                {Math.round(result.originalSize / 1024)}KB → {Math.round(result.newSize / 1024)}KB
              </span>
              <button onclick={() => download(result)} class="small">Download</button>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</main>

<style>
  .image-tool {
    padding: 2rem;
    max-width: 720px;
    margin: 0 auto;
  }

  .tool-header {
    margin-bottom: 1.5rem;
  }

  .back {
    display: inline-block;
    margin-bottom: 0.75rem;
    color: var(--accent);
    text-decoration: none;
    font-size: 0.9rem;
  }

  .back:hover {
    text-decoration: underline;
  }

  h1 {
    font-size: 1.75rem;
    margin: 0 0 0.25rem 0;
  }

  .tool-header p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .config {
    display: flex;
    gap: 2rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--card-bg);
    border-radius: 8px;
    border: 1px solid var(--card-border);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .field label {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .field select {
    padding: 0.4rem 0.6rem;
    border-radius: 6px;
    border: 1px solid var(--card-border);
    background: var(--bg);
  }

  .field input[type='range'] {
    width: 120px;
  }

  .upload {
    margin-bottom: 1rem;
  }

  .upload input[type='file'] {
    margin-bottom: 0.5rem;
  }

  .hint,
  .error {
    font-size: 0.85rem;
    margin: 0.25rem 0 0 0;
  }

  .error {
    color: #e74c3c;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  button {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: white;
    cursor: pointer;
    font-size: 0.95rem;
  }

  button:hover:not(:disabled) {
    opacity: 0.9;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  button.secondary {
    background: transparent;
    color: var(--text);
  }

  button.small {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
  }

  .results {
    padding: 1rem;
    background: var(--card-bg);
    border-radius: 8px;
    border: 1px solid var(--card-border);
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .results-header h2 {
    font-size: 1rem;
    margin: 0;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--card-border);
  }

  li:last-child {
    border-bottom: none;
  }

  .name {
    flex: 1;
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .size {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .err {
    font-size: 0.8rem;
    color: #e74c3c;
  }
</style>
