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

## Note

Uses `@jsquash/avif@1.1.2-single-thread-only` for Vite compatibility (multi-threaded AVIF has worker build issues).
