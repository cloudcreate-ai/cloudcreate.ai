<script>
  import { tick } from "svelte";
  import Cropper from "cropperjs";
  import "cropperjs/src/css/cropper.css";
  import { t } from "$lib/i18n.js";

  let { request = null } = $props();

  let imgRef = $state(null);
  let containerRef = $state(null);
  let cropper = $state(null);
  let previewUrl = $state(null);
  const RATIO_OPTIONS = [
    { key: "0", labelKey: "crop.modalRatioFree", value: 0 },
    { key: "1", label: "1:1", value: 1 },
    { key: "43", label: "4:3", value: 4 / 3 },
    { key: "34", label: "3:4", value: 3 / 4 },
    { key: "169", label: "16:9", value: 16 / 9 },
    { key: "916", label: "9:16", value: 9 / 16 },
    { key: "32", label: "3:2", value: 3 / 2 },
    { key: "23", label: "2:3", value: 2 / 3 },
    { key: "custom", labelKey: "crop.custom", value: "custom" },
  ];

  let cropData = $state({ width: 0, height: 0, ratio: 0 });
  let editW = $state(0);
  let editH = $state(0);
  let aspectMode = $state(0);
  let customRatioW = $state(16);
  let customRatioH = $state(9);
  let cropListener = null;

  const effectiveRatio = $derived.by(() => {
    if (aspectMode === "custom") {
      const w = Math.max(1, Number(customRatioW) || 1);
      const h = Math.max(1, Number(customRatioH) || 1);
      return w / h;
    }
    const opt = RATIO_OPTIONS.find((o) => o.key === aspectMode);
    return opt && typeof opt.value === "number" ? opt.value : 0;
  });

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
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext("2d").putImageData(imageData, 0, 0);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(URL.createObjectURL(blob));
        else reject(new Error("Failed to create blob"));
      }, "image/png");
    });
  }

  function syncFromCropper() {
    if (!cropper?.ready) return;
    const d = cropper.getData(true);
    const w = Math.round(d.width);
    const h = Math.round(d.height);
    cropData = { width: w, height: h, ratio: h > 0 ? w / h : 0 };
    editW = w;
    editH = h;
  }

  function applyRatio() {
    if (!cropper?.ready) return;
    const r = effectiveRatio;
    cropper.setAspectRatio(r === 0 || Number.isNaN(r) ? NaN : r);
    syncFromCropper();
  }

  function applySize() {
    if (!cropper?.ready || !request?.imageData) return;
    const imgW = request.imageData.width;
    const imgH = request.imageData.height;
    let w = Math.max(1, Math.floor(Number(editW) || 1));
    let h = Math.max(1, Math.floor(Number(editH) || 1));
    const r = effectiveRatio;
    if (r > 0) {
      h = Math.round(w / r);
      if (h < 1) {
        h = 1;
        w = Math.round(h * r);
      }
    }
    w = Math.min(w, imgW);
    h = Math.min(h, imgH);
    const d = cropper.getData(true);
    const cx = d.x + d.width / 2;
    const cy = d.y + d.height / 2;
    const x = Math.max(0, Math.min(imgW - w, cx - w / 2));
    const y = Math.max(0, Math.min(imgH - h, cy - h / 2));
    cropper.setData({ x, y, width: w, height: h });
    syncFromCropper();
  }

  function initAspectFromParams() {
    const ar = request.params?.aspectRatio ?? 0;
    const v = Number(ar);
    if (!v || Number.isNaN(v)) {
      aspectMode = "0";
      return;
    }
    const match = RATIO_OPTIONS.find(
      (o) => typeof o.value === "number" && Math.abs(o.value - v) < 0.02
    );
    aspectMode = match ? match.key : "custom";
    if (aspectMode === "custom") {
      customRatioW = Math.round(v * 100);
      customRatioH = 100;
    }
  }

  async function initCropper() {
    if (!request?.imageData || !imgRef || !containerRef) return;
    destroyCropper();
    initAspectFromParams();
    const ar = request.params?.aspectRatio ?? 0;
    const v = Number(ar);
    previewUrl = await imageDataToBlobUrl(request.imageData);
    await tick();
    imgRef.src = previewUrl;
    imgRef.onload = () => {
      const v = Number(ar);
      cropper = new Cropper(imgRef, {
        aspectRatio: v === 0 || Number.isNaN(v) ? NaN : v,
        viewMode: 1,
        dragMode: "crop",
        autoCropArea: 0.8,
      });
      cropListener = () => syncFromCropper();
      imgRef.addEventListener("crop", cropListener);
      setTimeout(() => syncFromCropper(), 50);
    };
  }

  function destroyCropper() {
    if (imgRef && cropListener) {
      imgRef.removeEventListener("crop", cropListener);
      cropListener = null;
    }
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
      request?.resolve({
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
      });
    } else {
      request?.reject(new Error("Cropper not ready"));
    }
  }

  function cancel() {
    request?.reject(new Error("Cancelled"));
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
    onkeydown={(e) => e.key === "Escape" && cancel()}
  >
    <div class="crop-modal-content">
      <div class="crop-modal-header">
        <h3>{t("workflow.cropRegion")}</h3>
        <div class="crop-modal-actions">
          <button
            class="btn preset-outlined-surface-200-800 btn-sm"
            onclick={cancel}>{t("common.cancel")}</button
          >
          <button class="btn preset-filled-primary-500 btn-sm" onclick={confirm}
            >{t("workflow.applyCrop")}</button
          >
        </div>
      </div>
      <div class="crop-modal-toolbar">
        <span class="crop-modal-label">{t("crop.modalRatio")}:</span>
        <select
          class="select select-sm w-24"
          value={aspectMode}
          onchange={(e) => {
            aspectMode = e.currentTarget.value;
            applyRatio();
          }}
        >
          {#each RATIO_OPTIONS as opt}
            <option value={opt.key}>
              {opt.labelKey ? t(opt.labelKey) : opt.label}
            </option>
          {/each}
        </select>
        {#if aspectMode === "custom"}
          <div class="crop-modal-ratio-inline">
            <input
              type="number"
              min="1"
              max="9999"
              bind:value={customRatioW}
              onkeydown={(e) => e.key === "Enter" && applyRatio()}
              class="input input-sm w-16 text-center"
            />
            <span>:</span>
            <input
              type="number"
              min="1"
              max="9999"
              bind:value={customRatioH}
              onkeydown={(e) => e.key === "Enter" && applyRatio()}
              class="input input-sm w-16 text-center"
            />
            <button
              class="btn preset-outlined-surface-200-800 btn-sm"
              onclick={applyRatio}
            >{t("crop.modalApplySize")}</button>
          </div>
        {/if}
        <span class="crop-modal-label">{t("crop.modalCurrentSize")}:</span>
        <span class="crop-modal-value">
          {cropData.width} × {cropData.height} px
        </span>
        <div class="crop-modal-edit">
          <input
            type="number"
            min="1"
            max="99999"
            bind:value={editW}
            onkeydown={(e) => e.key === "Enter" && applySize()}
            class="input input-sm w-20 text-center"
            placeholder="W"
          />
          <span class="text-surface-600-400">×</span>
          <input
            type="number"
            min="1"
            max="99999"
            bind:value={editH}
            onkeydown={(e) => e.key === "Enter" && applySize()}
            class="input input-sm w-20 text-center"
            placeholder="H"
          />
          <button
            class="btn preset-outlined-surface-200-800 btn-sm"
            onclick={applySize}
          >{t("crop.modalApplySize")}</button>
        </div>
      </div>
      <div
        bind:this={containerRef}
        class="crop-modal-canvas"
        style="height: 400px;"
      >
        <img
          bind:this={imgRef}
          alt="Crop"
          class="block max-w-full max-h-full"
        />
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
  .crop-modal-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--color-surface-200-800);
    font-size: 0.875rem;
  }
  .crop-modal-label {
    color: var(--color-surface-600-400);
  }
  .crop-modal-value {
    margin-right: 0.5rem;
  }
  .crop-modal-edit {
    display: flex;
    align-items: center;
    gap: 0.25rem 0.5rem;
  }
  .crop-modal-ratio-inline {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .select-sm {
    padding: 0.2rem 0.4rem;
    font-size: 0.8125rem;
  }
  .input-sm {
    padding: 0.2rem 0.4rem;
    font-size: 0.8125rem;
  }
  .crop-modal-canvas {
    position: relative;
    background: #000;
  }
</style>
