<script>
  /**
   * 中间主区的统一宽度包装：overview / operation / content 三类布局。
   */
  /** @type {{ layout?: 'overview' | 'operation' | 'content', wide?: boolean, class?: string, children?: import('svelte').Snippet }} */
  let { layout, wide = false, class: className = '', children } = $props();

  const layoutName = $derived(layout ?? (wide ? 'operation' : 'overview'));
</script>

<div
  class={['workspace-layout-' + layoutName, className].filter(Boolean).join(' ')}
>
  {@render children?.()}
</div>
