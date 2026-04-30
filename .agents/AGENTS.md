# CloudCreate.ai Agent Working Notes

本文件用于约束 Agent 在本仓库执行“新增页面”任务时的默认检查流程。

## 新增页面必查清单（默认必须执行）

### 1. 路由与导航

- 新建页面路由：`src/routes/[[locale]]/.../+page.svelte`
- 左侧导航入口：`src/lib/sidebarConfig.js`
- 分类归属（workspace/tools/creative）：`src/lib/navRegistry.js`
- 中英文文案键：`src/lib/i18n.js`

### 2. SEO / GEO

- SEO 路由映射：`src/lib/seoMeta.js`
- 预渲染与 sitemap：`src/lib/site-paths.js`
- 需要时补结构化数据：`src/lib/seoStructuredData.js`

### 3. AI 助理接入（强制）

每个新增页面都要提供专属 AI 提示词，不允许只走 generic fallback。

- 页面内注册：
  - `registerAgentPrompt({ templateKey, getParams })`
- i18n 必须新增：
  - `agentPrompt.<pageKey>`
  - `agentPrompt.panelBrief.<pageKey>`
- 验证：
  - 右侧 AI 面板可复制该页面专属提示词

推荐模板：

```svelte
import { page } from '$app/stores';
import { get } from 'svelte/store';
import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';

$effect(() => {
  return registerAgentPrompt({
    templateKey: 'agentPrompt.yourPageKey',
    getParams: () => ({ currentUrl: get(page).url.href }),
  });
});
```

### 4. 内容与示例

- 页面需明确“适用场景 + 边界”
- 至少 3 个可执行使用范例
- 中英文内容完整

### 5. 发布前验证

- `npm run build` 必须通过
- 新页面在左侧可见且可跳转
- 新页面已进入 `sitemap.xml`

## 发布检查规范（Release Gate）

每次发布前，Agent 默认执行以下检查并在汇报中逐条确认：

1. 构建与产物
- `npm run build` 成功
- `sitemap.xml` / `robots.txt` 已生成且包含预期站点地址

2. 路由与导航
- 新增页面路由可访问（`en/zh`）
- 左侧入口存在且分类归属正确

3. SEO/GEO
- `seoMeta` 已配置对应 title/description
- 需要时已补齐结构化数据（`seoStructuredData`）

4. AI 助理与 llm 同步（强制）
- 页面已注册 `registerAgentPrompt`
- i18n 已补 `agentPrompt.<pageKey>` 与 `panelBrief.<pageKey>`
- `toolPageSpec/registry` 已新增页面条目
- `agentPromptToolSpecData` 已补中英文 `interpolate/urlQuery`
- `/{locale}/ai-spec` 与 `/{locale}/ai-spec/llm.txt` 已包含新页面说明

5. 文档同步
- `docs/new-page-spec.md` 与相关专题文档已同步（如 GEO 清单）

## 规范文档入口

- 新增页面详细规范：`docs/new-page-spec.md`
- GEO 检查清单：`docs/geo-checklist.md`
