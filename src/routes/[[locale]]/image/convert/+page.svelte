<script>
  import ImageCompressConvert from '$lib/components/image/ImageCompressConvert.svelte';
</script>

<ImageCompressConvert
  defaultTargetFormat="webp"
  configKey="convert"
  titleKey="convert.title"
  descKey="convert.desc"
  presetName="convert"
  showSameAsOriginal={false}
/>
