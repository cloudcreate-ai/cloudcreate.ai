<script>
  import { Handle, Position } from '@xyflow/svelte';
  import { getNodeDef } from '../../../lib/workflow/registry.js';

  /** @type {import('@xyflow/svelte').NodeProps} */
  export let data;
  export let id;

  const def = getNodeDef('encode');
  const label = def?.label ?? 'Encode';
  const params = data?.params ?? {};
  const summary = params.targetFormat ? `${params.targetFormat} Q${params.quality ?? 75}` : `Q${params.quality ?? 75}`;
</script>

<div class="workflow-node workflow-node-encode">
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
