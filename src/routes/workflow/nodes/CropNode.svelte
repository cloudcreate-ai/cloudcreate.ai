<script>
  import { Handle, Position } from '@xyflow/svelte';
  import { getNodeDef } from '../../../lib/workflow/registry.js';

  /** @type {import('@xyflow/svelte').NodeProps} */
  export let data;
  export let id;

  const def = getNodeDef('crop');
  const label = def?.label ?? 'Crop';
</script>

<div class="workflow-node workflow-node-crop">
  {#each def?.inputs ?? [] as input}
    <Handle type="target" position={Position.Left} id={input.name} />
  {/each}
  <span class="node-label">{label}</span>
  {#each def?.outputs ?? [] as output}
    <Handle type="source" position={Position.Right} id={output.name} />
  {/each}
</div>
