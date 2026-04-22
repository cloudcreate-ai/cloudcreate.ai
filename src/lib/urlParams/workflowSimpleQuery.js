/**
 * 简单工作流：名称 n / name，描述 d / desc（可选）
 */
export function parseWorkflowSimpleQuery(sp) {
  const out = /** @type {{ workflowName?: string, workflowDescription?: string }} */ ({});
  const n = sp.get('n') ?? sp.get('name');
  if (n != null && n !== '') out.workflowName = n;
  const d = sp.get('d') ?? sp.get('desc');
  if (d != null && d !== '') out.workflowDescription = d;
  return out;
}

export function buildWorkflowSimpleQuery(workflowName, workflowDescription) {
  const p = new URLSearchParams();
  if (workflowName) p.set('n', workflowName);
  if (workflowDescription) p.set('d', workflowDescription);
  return p;
}
