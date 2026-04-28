<script>
  import { Handle, Position } from '@xyflow/svelte';
  import { getNodeDef } from '$lib/workflow/registry.js';

  const def = getNodeDef('output');
  const label = def?.label ?? 'Output';
</script>

<div class="workflow-node workflow-node-output">
  {#each def?.inputs ?? [] as input}
    <Handle type="target" position={Position.Left} id={input.name} />
  {/each}
  <span class="node-label">{label}</span>
</div>
