<script>
  import { locale } from '$lib/i18n.js';
  import WorkspacePageShell from '$lib/components/layout/WorkspacePageShell.svelte';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';

  const isZh = $derived($locale === 'zh');

  $effect(() => {
    return registerAgentPrompt({
      templateKey: 'agentPrompt.coreLibIntro',
      getParams: () => ({ currentUrl: get(page).url.href }),
    });
  });
</script>

<WorkspacePageShell layout="content">
  <article class="intro-page">
    <h1 class="intro-page-title">
      {isZh ? '核心库介绍：开发者集成能力' : 'Core Library Intro: Integrate Capabilities'}
    </h1>
    <p class="intro-page-p">
      {isZh
        ? '如果你在做自己的产品、内部工具或自动化服务，可以直接集成 CloudCreate 核心库，把图片、PDF、表格等处理能力接入到现有工程。'
        : 'If you are building your own product, internal tool, or automation service, you can integrate the CloudCreate core library directly and reuse image, PDF, table, and related capabilities.'}
    </p>
    <p class="intro-page-p">
      {isZh
        ? '这样可以与 web/CLI 保持一致能力模型：前台快速体验，后台稳定执行。'
        : 'This keeps a consistent capability model across web and CLI: fast exploration in UI, stable execution in code.'}
    </p>

    <h2 class="intro-page-h2">{isZh ? '适用场景' : 'Good fit scenarios'}</h2>
    <ul class="intro-page-list">
      <li>{isZh ? '把处理能力嵌入你自己的上传与编辑流程。' : 'Embed processing into your own upload/edit flows.'}</li>
      <li>{isZh ? '在服务端或本地任务中复用统一参数和输出。' : 'Reuse unified parameters/outputs in server or local jobs.'}</li>
      <li>{isZh ? '与现有业务逻辑、权限体系、审计流程集成。' : 'Integrate with your business logic, permissions, and audit flow.'}</li>
    </ul>

    <h2 class="intro-page-h2">{isZh ? '集成范例（3-5 个）' : 'Integration examples (3-5)'}</h2>
    <ol class="intro-page-list">
      <li>
        {isZh
          ? '在 SaaS 控制台中提供“上传即压缩/转换”能力'
          : 'Add compress/convert on upload inside your SaaS console'}
      </li>
      <li>
        {isZh
          ? '在内容平台里统一生成多规格图片（缩略图、分享图）'
          : 'Generate multi-size images (thumbnail/share) in a content platform'}
      </li>
      <li>
        {isZh
          ? '在后台任务中批量清洗媒体资产并输出标准格式'
          : 'Normalize media assets to standard formats in backend jobs'}
      </li>
      <li>
        {isZh
          ? '在私有化部署里保持“本地处理优先”的合规方案'
          : 'Keep privacy-first local processing in self-hosted environments'}
      </li>
      <li>
        {isZh
          ? '把同一能力同时提供给 web 前端与内部自动化服务'
          : 'Reuse the same capability model for both frontend and internal automation'}
      </li>
    </ol>

    <pre class="intro-page-code"><code>import * as cloudcreateCore from '@cloudcreate/core'

// 1) 接收上传文件
// 2) 调用 core 能力处理
// 3) 返回标准化产物与元数据</code></pre>

    <p class="intro-page-p">
      {isZh ? '相关链接：' : 'Useful links:'}
      <a href="https://github.com/cloudcreate-ai/cloudcreate-lib" target="_blank" rel="noopener noreferrer">GitHub</a>
      {' · '}
      <a href="https://www.npmjs.com/package/@cloudcreate/core" target="_blank" rel="noopener noreferrer">npm</a>
    </p>
  </article>
</WorkspacePageShell>

<style>
  .intro-page-title {
    margin: 0 0 0.6rem;
    font-size: 1.35rem;
    line-height: 1.3;
    color: var(--ccw-text-primary);
  }
  .intro-page-h2 {
    margin: 1.1rem 0 0.5rem;
    font-size: 0.98rem;
    line-height: 1.35;
    color: var(--ccw-text-primary);
  }
  .intro-page-p {
    margin: 0 0 0.75rem;
    color: var(--ccw-text-secondary);
    line-height: 1.6;
    font-size: 0.9rem;
  }
  .intro-page-list {
    margin: 0 0 0.8rem 1.15rem;
    color: var(--ccw-text-secondary);
    line-height: 1.6;
    font-size: 0.9rem;
  }
  .intro-page-code {
    margin: 0 0 0.85rem;
    padding: 0.7rem 0.8rem;
    border-radius: 8px;
    background: color-mix(in oklab, var(--ccw-surface-2) 80%, black 20%);
    color: var(--ccw-text-primary);
    font-size: 0.78rem;
    line-height: 1.45;
    overflow: auto;
  }
</style>
