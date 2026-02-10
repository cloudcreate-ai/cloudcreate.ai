# FreeTools

Browser-based utility collection built with Svelte and open-source libraries.

## Tech Stack

- **Svelte 5** + **Vite**
- **svelte-spa-router** - hash-based routing
- **jSquash** - image compression & format conversion (JPEG, PNG, WebP, AVIF)

## Project Structure

```
src/
├── lib/
│   └── imageProcessor.js   # Image decode/encode (jSquash)
├── routes/
│   ├── Workspace.svelte    # Home - tool cards grid
│   └── ImageTool.svelte    # Image compress & convert
├── App.svelte
├── app.css
└── main.js
```

## Development

```bash
npm install
npm run dev
```

## E2E 测试（Playwright）

在真实 dev 服务器上模拟用户操作（工作区导航、压缩/裁剪/缩放完整流程）。

```bash
npx playwright install   # 首次需安装浏览器
npm run test:e2e
```

- 用例目录：`e2e/`；场景覆盖工作区导航、语言切换、压缩/裁剪/缩放完整用户流程
- 测试用图：内存 buffer（`e2e/fixtures.js`），无需额外文件
- 本地：若已运行 `npm run dev`，会复用当前服务器；否则会自动启动。若首屏断言失败，可先浏览器打开 `http://localhost:5173/#/` 确认应用正常

## Build

```bash
npm run build
```

Output: `dist/`. Deploy as static site. Uses hash routing (`#/`, `#/image`), so no server config needed.

## Tools

### Image Tool

- **Compress** images with adjustable quality (1–100)
- **Convert** formats: JPEG, PNG, WebP, AVIF
- **Batch** process multiple images

## 开发规范

- [图片工具预览规范](docs/image-tools-preview.md) - 所有生成图片的工具必须提供预览功能

## Note

Uses `@jsquash/avif@1.1.2-single-thread-only` for Vite compatibility (multi-threaded AVIF has worker build issues).
