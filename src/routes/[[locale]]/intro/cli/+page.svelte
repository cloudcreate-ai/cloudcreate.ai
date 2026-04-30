<script>
  import { locale } from '$lib/i18n.js';
  import WorkspacePageShell from '$lib/components/layout/WorkspacePageShell.svelte';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';

  const isZh = $derived($locale === 'zh');

  $effect(() => {
    return registerAgentPrompt({
      templateKey: 'agentPrompt.cliIntro',
      getParams: () => ({ currentUrl: get(page).url.href }),
    });
  });
</script>

<WorkspacePageShell layout="content">
  <article class="intro-page">
    <h1 class="intro-page-title">
      {isZh ? 'CLI 介绍：与浏览器方案互补' : 'CLI Intro: Complementing the Browser'}
    </h1>
    <p class="intro-page-p">
      {isZh
        ? '浏览器方案上手快、分享方便，但在大批量处理、自动化脚本、CI 或更严格本地化流程里会有局限。CloudCreate CLI 可以补上这些场景。'
        : 'The browser workflow is great for speed and sharing, but it has limits for large batches, automation scripts, CI, or stricter local pipelines. CloudCreate CLI fills that gap.'}
    </p>
    <p class="intro-page-p">
      {isZh
        ? '建议把两者组合使用：在浏览器中快速试参数与验证效果，再把稳定流程迁移到 CLI 做批处理和自动化。'
        : 'Use both together: explore and validate quickly in the browser, then move stable flows to CLI for batch processing and automation.'}
    </p>
    <p class="intro-page-p">
      {isZh
        ? 'CLI 还特别适合 Agent 直接调用：命令可预测、输出可管道化，便于在自动化流程中稳定复用。'
        : 'CLI is also agent-friendly: predictable commands and pipeable outputs make it reliable in automation flows.'}
    </p>

    <h2 class="intro-page-h2">{isZh ? '推荐用法' : 'Recommended usage'}</h2>
    <ul class="intro-page-list">
      <li>{isZh ? '在线页面：快速试错、参数可视化、即时预览。' : 'Web pages: quick trial, visual controls, instant preview.'}</li>
      <li>{isZh ? 'CLI：可脚本化、可复用、适合本地与流水线。' : 'CLI: scriptable, reusable, ideal for local and pipeline use.'}</li>
      <li>{isZh ? '统一参数语义：降低从“试用”到“生产化”的迁移成本。' : 'Aligned parameter semantics: lower migration cost from trial to production.'}</li>
    </ul>

    <h2 class="intro-page-h2">{isZh ? '安装方式' : 'Installation'}</h2>
    <p class="intro-page-p">
      {isZh
        ? '常规使用建议全局安装；如果只想临时执行，也可以用 npx 免安装运行。安装后可使用 `cloudcreate` 或 `cc-tools` 命令。'
        : 'For regular use, install globally. For one-off runs, use npx without installation. After install, both `cloudcreate` and `cc-tools` are available.'}
    </p>
    <pre class="intro-page-code"><code># 全局安装（推荐）
npm install -g @cloudcreate/cli

# 免安装一次性运行
npx --yes @cloudcreate/cli css:minify ./app.css --level aggressive
npx --yes @cloudcreate/cli open image:resize --mode width --width 1200 --print</code></pre>

    <h2 class="intro-page-h2">{isZh ? 'AI 助理（Agent）使用建议' : 'AI assistant (agent) usage tips'}</h2>
    <ul class="intro-page-list">
      <li>
        {isZh
          ? '优先让 Agent 调用 CLI，而不是在聊天里“模拟处理”，结果更可复现。'
          : 'Prefer having the agent call CLI directly instead of simulating processing in chat for reproducible results.'}
      </li>
      <li>
        {isZh
          ? '使用明确输入/输出路径（含绝对路径）与固定参数，减少歧义。'
          : 'Use explicit input/output paths (prefer absolute paths) and fixed parameters to reduce ambiguity.'}
      </li>
      <li>
        {isZh
          ? '`open --print` 适合让 Agent 先产出可分享链接，再由用户在浏览器验证。'
          : '`open --print` is ideal when the agent should generate a shareable browser link first, then the user validates in UI.'}
      </li>
      <li>
        {isZh
          ? '在自动化流程中记录命令和参数，便于审计与回放。'
          : 'Log commands and parameters in automation flows for auditing and replay.'}
      </li>
    </ul>
    <pre class="intro-page-code"><code># Agent 友好范式：固定输入、固定输出、固定参数
cloudcreate image:compress /abs/in/banner.png -o /abs/out/banner.webp --quality 78 --format webp

# 先生成浏览器链接给用户确认
cloudcreate open image:resize --mode width --width 1200 --quality 82 --format webp --print

# 无全局安装时，Agent 也可直接运行
npx --yes @cloudcreate/cli table:convert /abs/in/data.xlsx --format csv -o /abs/out/data.csv</code></pre>

    <h2 class="intro-page-h2">{isZh ? '高频命令范例（浏览器补充 + Agent 直用）' : 'Common command examples (browser complement + agent-ready)'}</h2>
    <ol class="intro-page-list">
      <li>
        {isZh ? '图片压缩：适合批量减小体积后再上传。' : 'Image compression for lighter upload-ready assets.'}
      </li>
      <li>
        {isZh ? '图片转格式：统一转 WebP/JPEG 等，便于前端资源标准化。' : 'Image conversion to standardize formats like WebP/JPEG.'}
      </li>
      <li>
        {isZh ? '表格转换：xlsx/csv/tsv/json 互转，适合数据搬运。' : 'Table conversion across xlsx/csv/tsv/json for data handoff.'}
      </li>
      <li>
        {isZh ? 'CSS 最小化：构建前快速压缩样式。' : 'CSS minify before release/build.'}
      </li>
      <li>
        {isZh ? '归档打包/解包：本地文件交付与中转常用。' : 'Archive compress/decompress for packaging and transfer.'}
      </li>
    </ol>

    <pre class="intro-page-code"><code># 1) 图片压缩
cloudcreate image:compress ./input.png -o ./output.webp --quality 78 --format webp

# 2) 图片格式转换
cloudcreate image:compress ./input.jpg -o ./output.avif --quality 72 --format avif

# 3) 表格转换（xlsx -> csv）
cloudcreate table:convert ./report.xlsx --format csv -o ./report.csv --sheet 0

# 4) CSS 压缩
cloudcreate css:minify ./app.css -o ./app.min.css --level aggressive

# 5) 归档打包与解包
cloudcreate archive:compress ./dist --format zip -o ./dist.zip
cloudcreate archive:decompress ./dist.zip -o ./dist-unpacked

# Browser deep link（补充）
cloudcreate open image:resize --mode width --width 1200 --quality 82 --format webp --print</code></pre>

    <p class="intro-page-p">
      {isZh ? '相关链接：' : 'Useful links:'}
      <a href="https://github.com/cloudcreate-ai/cloudcreate-cli" target="_blank" rel="noopener noreferrer">GitHub</a>
      {' · '}
      <a href="https://www.npmjs.com/package/@cloudcreate/cli" target="_blank" rel="noopener noreferrer">npm</a>
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
