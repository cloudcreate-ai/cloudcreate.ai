# CloudCreate.ai 新增页面规范

本文是新增页面的统一检查规范，避免出现“页面可见，但导航/SEO/AI 助理未接入”的不完整发布。

## 1) 路由与导航

- [ ] 新页面路由已创建（`src/routes/[[locale]]/.../+page.svelte`）
- [ ] 左侧导航入口已接入（`src/lib/sidebarConfig.js`）
- [ ] 分类归属正确（`src/lib/navRegistry.js`）
- [ ] 文案 key 已补齐（`src/lib/i18n.js`）

## 2) SEO/GEO 接入

- [ ] 页面 SEO 映射已补齐（`src/lib/seoMeta.js`）
- [ ] 预渲染与 sitemap 路径已补齐（`src/lib/site-paths.js`）
- [ ] 如有必要，补充路由级结构化数据（`src/lib/seoStructuredData.js`）
- [ ] 页面 title/description 与内容语义一致（避免标题党）

## 3) AI 助理接入（必做）

- [ ] 页面内注册 `registerAgentPrompt(...)`
- [ ] `templateKey` 使用专用键（不要依赖 generic fallback）
- [ ] 在 `src/lib/i18n.js` 中补齐：
  - [ ] `agentPrompt.<pageKey>`
  - [ ] `agentPrompt.panelBrief.<pageKey>`
- [ ] 在 `llm` 目录链路中补齐：
  - [ ] `src/lib/toolPageSpec/registry.js` 新增 `id/path/titleKey`
  - [ ] `src/lib/i18n/agentPromptToolSpecData.js` 新增 `toolSpecDetail.<id>.interpolate/urlQuery`（中英文）
- [ ] 复制按钮文案与 AI 面板预览可正常显示

推荐注册样板：

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

## 4) 内容质量

- [ ] 页面说明“能做什么/不能做什么”清晰
- [ ] 至少 3 个可执行使用范例（命令、参数或流程）
- [ ] 中英文内容完整，不出现单语缺失
- [ ] 外链（GitHub/npm/官网）有效

## 5) 发布前验证

- [ ] `npm run build` 通过
- [ ] 左侧入口可见且跳转正确
- [ ] 右侧 AI 面板可复制专属提示词（非 generic）
- [ ] `/{locale}/ai-spec` 与 `/{locale}/ai-spec/llm.txt` 已包含新页面说明
- [ ] 新页面包含在 `sitemap.xml`

---

## 本次问题复盘（2026-04-30）

新增 `intro/cli` 与 `intro/core-lib` 初版时，页面内容已上线，但未同步 AI 助理专属提示词注册。后续已修复并纳入本规范“AI 助理接入（必做）”。
