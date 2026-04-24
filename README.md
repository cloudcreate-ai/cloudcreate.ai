# CloudCreate.ai

[English](#english) · [中文](#中文)

---

## English

A **human–AI creative toolkit**: image, PDF, table, CSS, archive, and workflow tools that run mainly in the browser, with a focus on local processing and a reusable workspace shell.

### Tech stack

**SvelteKit** (Svelte 5, Vite) with **@sveltejs/adapter-static** prerendering; styling uses **Tailwind** and Skeleton, among others. See the `deploy` script in `package.json` for a **Cloudflare Pages** example.

### Live site

<https://cloudcreate.ai>

### Public container image

GHCR:

```bash
docker pull ghcr.io/cloudcreate-ai/cloudcreate-ai:latest
```

### AI-assisted development

Parts of the docs, implementation, and tests were produced with **AI assistance** and reviewed by humans; this is not a guarantee of production or security fitness. Public pages and data are not a formal service commitment.

### Learn more

For structure, per-tool conventions, and file layout, **use your IDE or an AI assistant to read the repository** (e.g. browse `src/lib`, `src/routes`). This README is only an overview.

### Local development

```bash
npm install && npm run dev
```

```bash
npm run build
```

---

## 中文

面向「人与 AI 协作」的创意工具集：**图片 / PDF / 表格 / CSS / 压缩包 / 工作流**等以浏览器端为主，侧重本地处理与可复用工作区体验。

### 技术栈

**SvelteKit**（Svelte 5、Vite）+ **@sveltejs/adapter-static** 静态预渲染，样式以 **Tailwind** 与 Skeleton 等为主；部署示例见 `package.json` 中的 `deploy`（Cloudflare Pages）。

### 线上地址

<https://cloudcreate.ai>

### 公开镜像

GHCR：

```bash
docker pull ghcr.io/cloudcreate-ai/cloudcreate-ai:latest
```

### AI 辅助开发声明

本仓库部分说明、实现与测试由 **AI 辅助生成**，并经过人工审阅与调整；不保证与真实业务或安全要求完全一致。公开页面与数据不代表任何正式服务承诺。

### 了解更多

**结构、各工具约定与细节目录，请用 IDE / 仓库的 AI 能力通读项目**（或配合搜索 `src/lib`、`src/routes`），本 README 仅作概览、不作完整文档。

### 本地开发

```bash
npm install && npm run dev
```

```bash
npm run build
```
