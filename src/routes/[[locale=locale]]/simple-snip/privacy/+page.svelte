<script>
  /**
   * Simple Snip 应用隐私政策，供 App Store 隐私政策网址使用。
   * 与站点 /privacy（浏览器工具）分开。
   */
  import { locale } from '$lib/i18n.js';
  import { localePath } from '$lib/localePath.js';
  import { siteContactEmail } from '$lib/siteConfig.js';
  import WorkspacePageShell from '$lib/components/layout/WorkspacePageShell.svelte';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';

  const isZh = $derived($locale === 'zh');

  $effect(() => {
    return registerAgentPrompt({
      templateKey: 'agentPrompt.simpleSnipPrivacy',
      getParams: () => ({ currentUrl: get(page).url.href }),
    });
  });
</script>

<WorkspacePageShell layout="content">
  <article class="snip-legal">
    <h1 class="snip-legal-title">{isZh ? 'Simple Snip 隐私政策' : 'Simple Snip Privacy Policy'}</h1>
    <p class="snip-legal-updated">
      {isZh ? '最近更新：2026 年 10 月 9 日' : 'Last updated: 9 October 2026'}
    </p>

    <p class="snip-legal-p">
      {isZh
        ? '本政策只说明 macOS 截图应用 Simple Snip，不涵盖其他产品。'
        : 'This policy describes Simple Snip, a macOS screenshot app. It does not describe any other product.'}
    </p>

    <h2 class="snip-legal-h2">{isZh ? '数据收集' : 'Data collection'}</h2>
    <p class="snip-legal-p">
      {isZh
        ? 'Simple Snip 不收集、不存储、也不传输个人数据。它没有账号、没有统计分析、没有广告，也不连接网络。'
        : 'Simple Snip does not collect, store, or transmit personal data. It has no account, no analytics, no advertising, and it does not connect to the network.'}
    </p>

    <h2 class="snip-legal-h2">{isZh ? '截图' : 'Screenshots'}</h2>
    <p class="snip-legal-p">
      {isZh
        ? '截图留在你的 Mac 上。你可以选择复制到剪贴板、保存为文件，或两者都做。文件只会写入你选定的文件夹。'
        : 'Screenshots stay on your Mac. You choose whether to copy one to the clipboard, save it as a file, or both. Saved files are written only to a folder you select.'}
    </p>

    <h2 class="snip-legal-h2">{isZh ? '屏幕录制' : 'Screen Recording'}</h2>
    <p class="snip-legal-p">
      {isZh
        ? '应用请求「屏幕录制」权限，只为了截取屏幕。Simple Snip 不会把截到的图片发送到任何地方。'
        : 'The app asks for Screen Recording permission so it can capture the screen. That permission is used only for capture. Simple Snip does not send the captured image anywhere.'}
    </p>

    <h2 class="snip-legal-h2">{isZh ? '联系' : 'Contact'}</h2>
    <p class="snip-legal-p">
      {isZh ? '对本政策有疑问，请发送邮件到 ' : 'Questions about this policy: '}
      <a href={'mailto:' + siteContactEmail}>{siteContactEmail}</a>
      {isZh ? '。' : '.'}
    </p>
    <p class="snip-legal-p">
      <a href={localePath($page.url.pathname, '/simple-snip')}>{isZh ? '技术支持' : 'Support'}</a>
    </p>
  </article>
</WorkspacePageShell>

<style>
  .snip-legal-title {
    margin: 0 0 0.35rem;
    font-size: 1.35rem;
    font-weight: 700;
    line-height: 1.3;
    color: var(--ccw-text-primary);
  }
  .snip-legal-updated {
    margin: 0 0 1.25rem;
    font-size: 0.75rem;
    color: var(--ccw-text-muted);
  }
  .snip-legal-h2 {
    margin: 1.1rem 0 0.45rem;
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.35;
    color: var(--ccw-text-primary);
  }
  .snip-legal-p {
    margin: 0 0 0.75rem;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--ccw-text-secondary);
  }
  .snip-legal-p a {
    color: var(--ccw-accent);
  }
</style>
