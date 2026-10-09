<script>
  /**
   * Simple Snip 产品页：Mac 菜单栏截图应用介绍，文案与商店说明一致。
   */
  import { locale } from '$lib/i18n.js';
  import { localePath } from '$lib/localePath.js';
  import WorkspacePageShell from '$lib/components/layout/WorkspacePageShell.svelte';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { registerAgentPrompt } from '$lib/stores/agentPromptStore.js';

  const isZh = $derived($locale === 'zh');

  $effect(() => {
    return registerAgentPrompt({
      templateKey: 'agentPrompt.simpleSnip',
      getParams: () => ({ currentUrl: get(page).url.href }),
    });
  });
</script>

<WorkspacePageShell layout="content">
  <article class="snip-page">
    <header class="snip-hero">
      <img class="snip-icon" src="/simple-snip/icon.webp" width="64" height="64" alt="" />
      <div>
        <h1 class="snip-title">Simple Snip</h1>
        <p class="snip-subtitle">
          {isZh ? '极简截图，不需要联网，没有额外功能' : 'Screenshots only. No network.'}
        </p>
      </div>
    </header>

    <p class="snip-p">
      {isZh
        ? '为 Apple 芯片原生开发的极简截图工具。支持多屏幕切换，方便程序员、设计师在多台显示器上截图。不需要安装 Rosetta。'
        : 'A minimal screenshot tool built natively for Apple silicon. Switch between displays, then save to the clipboard or a file. No need to install Rosetta.'}
    </p>
    <p class="snip-p">
      {isZh
        ? '作为 Snip 的粉丝，很遗憾看到它多年前就停止更新了，所以我自己做了这款截图软件。Simple Snip 只做截图。它为 Apple 芯片（M 系列）原生开发，在 M 芯片 Mac 上直接运行。'
        : 'As a fan of Snip, I was sorry to see it stop updating years ago, so I built this screenshot app myself. Simple Snip only takes screenshots. It runs natively on Apple silicon (M-series Macs).'}
    </p>

    <figure class="snip-figure">
      <img
        src="/simple-snip/annotate.webp"
        width="1600"
        height="1077"
        alt={isZh ? 'Simple Snip 标注窗口：箭头、圆圈和裁剪后的截图' : 'Simple Snip markup window with arrows, circles, and the captured image'}
      />
      <figcaption>
        {isZh ? '拖选或点选窗口后，在预览里标注，再保存或取消。' : 'Mark up the preview, then save. Esc or Cancel discards it.'}
      </figcaption>
    </figure>

    <h2 class="snip-h2">{isZh ? '功能' : 'Features'}</h2>
    <ul class="snip-list">
      <li>{isZh ? '全局快捷键 ⌘⌥C，也可以从菜单栏打开' : 'Global shortcut ⌘⌥C, or open it from the menu bar'}</li>
      <li>{isZh ? '拖选区域，或悬停后单击截取窗口' : 'Drag a region, or hover and click to capture a window'}</li>
      <li>{isZh ? '全屏截图，可在多块屏幕之间选择' : 'Capture a full screen, and choose among multiple displays'}</li>
      <li>{isZh ? '箭头、矩形、椭圆、直线、手绘、文字、马赛克、裁剪' : 'Arrow, rectangle, oval, line, pen, text, mosaic, and crop'}</li>
      <li>{isZh ? '保存到剪贴板、文件，或两者同时保存' : 'Save to the clipboard, a file, or both'}</li>
      <li>{isZh ? '文件格式支持 PNG、无损 PNG、JPEG 和 WebP' : 'PNG, Lossless PNG, JPEG, and WebP'}</li>
      <li>{isZh ? '按 Esc 或 Cancel 丢弃本次截图' : 'Press Esc or Cancel to discard the screenshot'}</li>
    </ul>

    <h2 class="snip-h2">{isZh ? '怎么用' : 'How to use it'}</h2>
    <ol class="snip-list">
      <li>
        {isZh
          ? '启动后看菜单栏里的相机图标。这是菜单栏应用，Dock 里没有图标。'
          : 'After launch, use the camera icon in the menu bar. It is a menu bar app and does not show a Dock icon.'}
      </li>
      <li>
        {isZh
          ? '按 ⌘⌥C，或从菜单栏选择 Capture。拖选一块区域，或悬停在窗口上后单击。鼠标移到哪块屏幕，就在那块屏幕上截。'
          : 'Press ⌘⌥C, or choose Capture from the menu bar. Drag a region, or hover a window and click. Move the pointer to the display you want.'}
      </li>
      <li>
        {isZh
          ? '标注后保存到剪贴板、文件，或两者都保存。Esc 或 Cancel 会丢掉这张图。'
          : 'Annotate, then save to the clipboard, a file, or both. Esc or Cancel discards the image.'}
      </li>
    </ol>

    <figure class="snip-figure snip-figure-narrow">
      <img
        src="/simple-snip/preferences.webp"
        width="1200"
        height="950"
        alt={isZh ? 'Simple Snip 偏好设置：快捷键、保存位置和屏幕录制权限' : 'Simple Snip preferences for shortcut, save location, and Screen Recording'}
      />
      <figcaption>
        {isZh
          ? '偏好设置里改快捷键、保存位置和格式。截屏需要「屏幕录制」权限。'
          : 'Set the shortcut, destination, and format in Preferences. Screen Recording permission is required.'}
      </figcaption>
    </figure>

    <h2 class="snip-h2">{isZh ? '运行环境' : 'Requirements'}</h2>
    <ul class="snip-list">
      <li>{isZh ? 'macOS 12 或更高版本。' : 'macOS 12 or later.'}</li>
      <li>{isZh ? 'Apple 芯片（M 系列）Mac，不需要安装 Rosetta。' : 'Apple silicon (M-series) Mac. Rosetta is not required.'}</li>
      <li>{isZh ? '从菜单栏打开，不需要联网。免费。' : 'Opens from the menu bar. No network connection. Free.'}</li>
    </ul>

    <h2 class="snip-h2">{isZh ? '屏幕录制' : 'Screen Recording'}</h2>
    <p class="snip-p">
      {isZh
        ? 'macOS 需要「屏幕录制」权限。从菜单栏打开 Preferences。如果状态不是 Granted，点 Grant Access，并在系统设置里允许 Simple Snip。然后退出应用，再打开一次。'
        : 'macOS requires Screen Recording permission. Open Preferences from the menu bar. If the status is not Granted, choose Grant Access and allow Simple Snip in System Settings. Then quit the app and open it again.'}
    </p>

    <h2 class="snip-h2">{isZh ? '联系' : 'Contact'}</h2>
    <p class="snip-p">
      {isZh ? '发送邮件到 ' : 'Email '}
      <a href="mailto:contact@cloudcreate.ai">contact@cloudcreate.ai</a>
      {isZh ? '。' : '.'}
      {' '}
      <a href={localePath($page.url.pathname, '/simple-snip/privacy')}>
        {isZh ? '隐私政策' : 'Privacy policy'}
      </a>
    </p>
  </article>
</WorkspacePageShell>

<style>
  .snip-hero {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    margin: 0 0 1rem;
  }
  .snip-icon {
    width: 4rem;
    height: 4rem;
    border-radius: 0.9rem;
    flex-shrink: 0;
  }
  .snip-title {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.2;
    color: var(--ccw-text-primary);
  }
  .snip-subtitle {
    margin: 0.25rem 0 0;
    color: var(--ccw-text-muted);
    font-size: 0.95rem;
  }
  .snip-h2 {
    margin: 1.15rem 0 0.45rem;
    font-size: 0.98rem;
    line-height: 1.35;
    color: var(--ccw-text-primary);
  }
  .snip-p {
    margin: 0 0 0.75rem;
    color: var(--ccw-text-secondary);
    line-height: 1.6;
    font-size: 0.9rem;
  }
  .snip-list {
    margin: 0 0 0.8rem 1.15rem;
    color: var(--ccw-text-secondary);
    line-height: 1.6;
    font-size: 0.9rem;
  }
  .snip-figure {
    margin: 0.4rem 0 1rem;
  }
  .snip-figure img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 10px;
    border: 1px solid var(--ccw-border-contrast);
  }
  .snip-figure-narrow {
    max-width: 28rem;
  }
  .snip-figure figcaption {
    margin-top: 0.4rem;
    font-size: 0.78rem;
    line-height: 1.45;
    color: var(--ccw-text-muted);
  }
  .snip-p a {
    color: var(--ccw-accent);
  }
</style>
