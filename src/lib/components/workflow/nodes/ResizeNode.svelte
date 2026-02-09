<script>
  import { Handle, Position } from '@xyflow/svelte';
  import { getNodeDef } from '$lib/workflow/registry.js';

  /** @type {import('@xyflow/svelte').NodeProps} */
  export let data;
  export let id;

  const def = getNodeDef('resize');
  const label = def?.label ?? 'Resize';
  const params = data?.params ?? {};
  const mode = params.scaleMode ?? 'percent';
  const summary = mode === 'percent' ? `${params.scalePercent ?? 50}%` : mode;
</script>

<div class="workflow-node workflow-node-resize">
  {#each def?.inputs ?? [] as input}
    <Handle type="target" position={Position.Left} id={input.name} />
  {/each}
  <div class="node-content">
    <span class="node-label">{label}</span>
    <span class="node-params">{summary}</span>
  </div>
  {#each def?.outputs ?? [] as output}
    <Handle type="source" position={Position.Right} id={output.name} />
  {/each}
</div>
