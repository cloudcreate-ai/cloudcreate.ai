<script>
  import { browser } from '$app/environment';
  import { onDestroy } from 'svelte';
  import { t } from '$lib/i18n.js';
  import ToolPageHeader from '$lib/components/ToolPageHeader.svelte';
  import ZoomControls from '$lib/components/common/ZoomControls.svelte';

  let inputRef = $state(null);
  let dropActive = $state(false);
  let images = $state([]);
  let selectedIndex = $state(0);
  let zoom = $state(1);

  const acceptedTypes =
    'image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp,image/svg+xml';

  function formatSize(bytes) {
    if (!bytes && bytes !== 0) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function safeSelect(index) {
    if (!images.length) {
      selectedIndex = 0;
      return;
    }
    selectedIndex = Math.max(0, Math.min(images.length - 1, index));
  }

  async function readImage(file) {
    const dataUrl = await file.arrayBuffer().then((buf) => {
      const blob = new Blob([buf], { type: file.type });
      return URL.createObjectURL(blob);
    });
    const metadata = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onload = null;
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
    return {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type || 'image',
      url: dataUrl,
      ...metadata,
    };
  }

  async function handleFiles(fileList) {
    if (!browser) return;
    const tasks = Array.from(fileList || [])
      .filter((file) => file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|avif|bmp|svg)$/i.test(file.name))
      .map((file) => readImage(file).catch(() => null));
    if (!tasks.length) return;
    const results = await Promise.all(tasks);
    const newImages = results.filter(Boolean);
    images = [...images, ...newImages];
    safeSelect(images.length - newImages.length);
    zoom = 1;
  }

  function handleInputChange(event) {
    handleFiles(event.target?.files);
    if (inputRef) inputRef.value = '';
  }

  function handleDragOver(event) {
    event.preventDefault();
    dropActive = true;
  }

  function handleDragLeave(event) {
    event.preventDefault();
    dropActive = false;
  }

  function handleDrop(event) {
    event.preventDefault();
    dropActive = false;
    handleFiles(event.dataTransfer?.files);
  }

  function selectImage(index) {
    safeSelect(index);
    zoom = 1;
  }

  function clearAll() {
    images.forEach((img) => URL.revokeObjectURL(img.url));
    images = [];
    selectedIndex = 0;
    zoom = 1;
  }

  onDestroy(() => {
    images.forEach((img) => URL.revokeObjectURL(img.url));
  });

  $effect(() => {
    images;
    safeSelect(selectedIndex);
  });

  const selectedImage = $derived(images[selectedIndex]);
</script>

<div class="workspace-content workspace-content-wide image-preview">
  <ToolPageHeader titleKey="imagePreview.title" descKey="imagePreview.desc" />

  <section class="upload card preset-outlined-surface-200-800 p-4 mb-4">
    <p class="text-sm font-medium m-0 mb-2">{t('imagePreview.upload')}</p>
    <div class="actions">
      <input
        bind:this={inputRef}
        type="file"
        accept={acceptedTypes}
        multiple
        class="hidden"
        onchange={handleInputChange}
      />
      <button
        type="button"
        class="btn btn-sm preset-outlined-surface-200-800"
        onclick={() => inputRef?.click()}
      >
        {t('imagePreview.upload')}
      </button>
      <button
        type="button"
        class="btn btn-sm preset-outlined-surface-200-800"
        onclick={clearAll}
        disabled={!images.length}
      >
        {t('common.clearAll')}
      </button>
    </div>
    <div
      class="drop-zone {dropActive ? 'is-active' : ''}"
      role="button"
      tabindex="0"
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      onclick={() => inputRef?.click()}
      onkeydown={(e) => e.key === 'Enter' && inputRef?.click()}
    >
      <p class="hint">{t('imagePreview.uploadHint')}</p>
      <p class="sub-hint">{t('imagePreview.dropHint')}</p>
    </div>
  </section>

  <section class="image-preview-panel card preset-outlined-surface-200-800 p-4">
    {#if images.length}
      <div class="image-preview-layout">
        <div class="thumb-list">
          <h3 class="list-title">{t('imagePreview.listTitle')}</h3>
          <div class="thumb-grid">
            {#each images as image, index}
              <button
                type="button"
                class="thumb-card {selectedIndex === index ? 'is-active' : ''}"
                onclick={() => selectImage(index)}
              >
                <img src={image.url} alt={image.name} loading="lazy" />
                <div class="thumb-meta">
                  <p class="thumb-name">{image.name}</p>
                  <p class="thumb-size">{formatSize(image.size)}</p>
                </div>
              </button>
            {/each}
          </div>
        </div>
        <div class="viewer">
          {#if selectedImage}
            <div class="viewer-toolbar">
              <div class="viewer-info">
                <span class="viewer-name">{selectedImage.name}</span>
                <span class="viewer-meta">
                  {t('imagePreview.infoFormat')}: {selectedImage.type || '--'} ·
                  {t('imagePreview.infoResolution')}: {selectedImage.width}×{selectedImage.height} ·
                  {t('imagePreview.infoSize')}: {formatSize(selectedImage.size)}
                </span>
              </div>
              <div class="zoom-control">
                <span class="zoom-label">{t('imagePreview.zoomLabel')}</span>
                <ZoomControls
                  value={zoom}
                  min={0.25}
                  max={3}
                  step={0.05}
                  resetValue={1}
                  suffix="%"
                  scaleDisplay={true}
                  onchange={(v) => (zoom = v)}
                />
              </div>
            </div>
            <div class="viewer-canvas">
              <div class="viewer-canvas-inner" style={`transform: scale(${zoom});`}>
                <img src={selectedImage.url} alt={selectedImage.name} loading="lazy" />
              </div>
            </div>
          {:else}
            <p class="placeholder">{t('imagePreview.noSelection')}</p>
          {/if}
        </div>
      </div>
    {:else}
      <p class="placeholder">{t('imagePreview.emptyPlaceholder')}</p>
    {/if}
  </section>
</div>

<style>
  .image-preview :global(img) {
    max-width: 100%;
    display: block;
  }
  .upload .actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  .drop-zone {
    border: 1px dashed var(--ccw-border-contrast);
    border-radius: var(--ccw-radius-card);
    padding: 1rem;
    text-align: center;
    background: rgba(255, 255, 255, 0.02);
    transition: border-color 150ms ease, background-color 150ms ease;
    cursor: pointer;
  }
  .drop-zone.is-active {
    border-color: var(--ccw-accent);
    background: rgba(10, 132, 255, 0.08);
  }
  .drop-zone .hint {
    margin: 0;
    font-size: 0.9rem;
    color: var(--ccw-text-primary);
  }
  .drop-zone .sub-hint {
    margin: 0.25rem 0 0;
    font-size: 0.8rem;
    color: var(--ccw-text-muted);
  }
  .image-preview-panel {
    min-height: 420px;
  }
  .image-preview-layout {
    display: flex;
    gap: 1rem;
  }
  .thumb-list {
    flex: 0 0 240px;
    display: flex;
    flex-direction: column;
  }
  .list-title {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ccw-text-muted);
    margin: 0 0 0.5rem 0;
  }
  .thumb-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 520px;
    overflow-y: auto;
    padding-right: 0.25rem;
  }
  .thumb-card {
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    background: var(--ccw-bg-elevated);
    padding: 0.4rem;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    cursor: pointer;
    transition: border-color 150ms ease, background-color 150ms ease;
    color: var(--ccw-text-secondary);
  }
  .thumb-card img {
    width: 100%;
    height: 120px;
    object-fit: cover;
    border-radius: 4px;
  }
  .thumb-card.is-active {
    border-color: var(--ccw-accent);
    background: rgba(10, 132, 255, 0.08);
    color: var(--ccw-text-primary);
  }
  .thumb-meta {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.75rem;
  }
  .thumb-name {
    margin: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .thumb-size {
    margin: 0;
    color: var(--ccw-text-muted);
  }
  .viewer {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 420px;
  }
  .viewer-toolbar {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }
  .viewer-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .viewer-name {
    font-weight: 600;
    color: var(--ccw-text-primary);
  }
  .viewer-meta {
    font-size: 0.8rem;
    color: var(--ccw-text-muted);
  }
  .zoom-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .zoom-control .zoom-label {
    font-size: 0.8rem;
    color: var(--ccw-text-secondary);
  }
  .viewer-canvas {
    flex: 1;
    border: 1px solid var(--ccw-border-soft);
    border-radius: var(--ccw-radius-card);
    background: var(--ccw-bg-base);
    padding: 1rem;
    overflow: auto;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .viewer-canvas-inner {
    transform-origin: center center;
    transition: transform 150ms ease;
    box-shadow: var(--ccw-shadow-soft);
    background: #111;
  }
  .viewer-canvas-inner img {
    display: block;
  }
  .placeholder {
    margin: 0;
    color: var(--ccw-text-muted);
    text-align: center;
  }

  @media (max-width: 960px) {
    .image-preview-layout {
      flex-direction: column;
    }
    .thumb-list {
      flex: none;
    }
    .thumb-grid {
      max-height: 220px;
      flex-wrap: nowrap;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
    .thumb-card img {
      height: 100px;
    }
  }
</style>
