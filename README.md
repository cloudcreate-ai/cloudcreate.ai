# CloudCreate.ai

面向「人与 AI 协作」的创意工具集：**图片 / PDF / 表格 / CSS / 压缩包 / 工作流**等以浏览器端为主，侧重本地处理与可复用工作区体验。

## 技术栈

**SvelteKit**（Svelte 5、Vite）+ **@sveltejs/adapter-static** 静态预渲染，样式以 **Tailwind** 与 Skeleton 等为主；部署示例见 `package.json` 中的 `deploy`（Cloudflare Pages）。

## 线上地址

<https://cloudcreate.ai>

## AI 辅助开发声明

本仓库部分说明、实现与测试由 **AI 辅助生成**，并经过人工审阅与调整；不保证与真实业务或安全要求完全一致。公开页面与数据不代表任何正式服务承诺。

## 了解更多

**结构、各工具约定与细节目录，请用 IDE / 仓库的 AI 能力通读项目**（或配合搜索 `src/lib`、`src/routes`），本 README 仅作概览、不作完整文档。

## 本地开发

```bash
npm install && npm run dev
```

```bash
npm run build
```
