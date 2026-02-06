<script>
  import { Handle, Position } from '@xyflow/svelte';
  import { getNodeDef } from '../../../lib/workflow/registry.js';

  export let data;
  export let id;

  const def = getNodeDef('input');
  const label = def?.label ?? 'Input';
</script>

<div class="workflow-node workflow-node-input">
  {#each def?.outputs ?? [] as output}
    <Handle type="source" position={Position.Right} id={output.name} />
  {/each}
  <span class="node-label">{label}</span>
</div>
