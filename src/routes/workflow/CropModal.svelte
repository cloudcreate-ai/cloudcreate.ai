<script>
  import { tick } from 'svelte';
  import Cropper from 'cropperjs';
  import 'cropperjs/src/css/cropper.css';
  import { t } from '../../lib/i18n.js';

  let { request = null } = $props();

  let imgRef = $state(null);
  let containerRef = $state(null);
  let cropper = $state(null);
  let previewUrl = $state(null);

  $effect(() => {
    if (!request?.imageData) return;
    let cancelled = false;
    const t1 = setTimeout(async () => {
      await tick();
      if (cancelled || !imgRef || !containerRef || !request) return;
      initCropper();
    }, 10);
    return () => {
      cancelled = true;
      clearTimeout(t1);
      destroyCropper();
    };
  });

  function imageDataToBlobUrl(imageData) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext('2d').putImageData(imageData, 0, 0);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(URL.createObjectURL(blob));
          else reject(new Error('Failed to create blob'));
        },
        'image/png'
      );
    });
  }

  async function initCropper() {
    if (!request?.imageData || !imgRef || !containerRef) return;
    destroyCropper();
    previewUrl = await imageDataToBlobUrl(request.imageData);
    await tick();
    imgRef.src = previewUrl;
    imgRef.onload = () => {
      const aspectRatio = request.params?.aspectRatio ?? 0;
      const v = Number(aspectRatio);
      cropper = new Cropper(imgRef, {
        aspectRatio: v === 0 || Number.isNaN(v) ? NaN : v,
        viewMode: 1,
        dragMode: 'crop',
        autoCropArea: 0.8,
      });
    };
  }

  function destroyCropper() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
  }

  function confirm() {
    if (cropper) {
      const data = cropper.getData(true);
      request?.resolve({ x: data.x, y: data.y, width: data.width, height: data.height });
    } else {
      request?.reject(new Error('Cropper not ready'));
    }
  }

  function cancel() {
    request?.reject(new Error('Cancelled'));
  }
</script>

{#if request}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
  <div
    class="crop-modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Crop region"
    onclick={(e) => e.target === e.currentTarget && cancel()}
    onkeydown={(e) => e.key === 'Escape' && cancel()}
  >
    <div class="crop-modal-content">
      <div class="crop-modal-header">
        <h3>{t('workflow.cropRegion')}</h3>
        <div class="crop-modal-actions">
          <button class="btn preset-outlined-surface-200-800 btn-sm" onclick={cancel}>{t('common.close')}</button>
          <button class="btn preset-filled-primary-500 btn-sm" onclick={confirm}>{t('workflow.applyCrop')}</button>
        </div>
      </div>
      <div bind:this={containerRef} class="crop-modal-canvas" style="height: 400px;">
        <img bind:this={imgRef} alt="Crop" class="block max-w-full max-h-full" />
      </div>
    </div>
  </div>
{/if}

<style>
  .crop-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    padding: 1rem;
  }
  .crop-modal-content {
    background: var(--color-surface-50-950);
    border-radius: 8px;
    overflow: hidden;
    max-width: 90vw;
    max-height: 90vh;
  }
  .crop-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--color-surface-200-800);
  }
  .crop-modal-header h3 {
    margin: 0;
    font-size: 1rem;
  }
  .crop-modal-actions {
    display: flex;
    gap: 0.5rem;
  }
  .crop-modal-canvas {
    position: relative;
    background: #000;
  }
</style>
