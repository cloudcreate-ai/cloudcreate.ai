<script>
  /**
   * 工具/创意等中间主区的统一宽度与可选 class 包装，与全局 .workspace-content 对齐。
   */
  let { wide = false, class: className = '', children } = $props();
</script>

<div
  class={['workspace-content', wide ? 'workspace-content-wide' : '', className].filter(Boolean).join(' ')}
>
  {@render children?.()}
</div>
