# CuffScript website

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-Apache%202.0-red?style=flat)

---

Website for [CuffScript](https://github.com/cuffscript/cuffscript): a landing
page, a browser IDE (editor, multi-file projects, stdin, an AST/token
viewer), and a full language guide — built with Vite + TypeScript +
CodeMirror 6.

This repository is the **website only**. The compiled engine itself
(`cuffscript.mjs` / `cuffscript.wasm`) is published separately as the
[`cuffscript-wasm`](https://www.npmjs.com/package/cuffscript-wasm) npm package
from the main `cuffscript` repository and consumed here as an ordinary
dependency.

## Pages

Three entry points, each its own folder so they build to clean URLs:

- `/` — `index.html` / `src/home.ts` — landing page.
- `/ide/` — `ide/index.html` / `src/ide.ts` — the IDE.
- `/guide/` — `guide/index.html` / `src/guide.ts` — the language guide.

`src/ui/header.ts` renders the shared header (logo, nav, theme toggle) on all
three so there's one place to change it.

## Structure

- `src/engine/` — `engine.ts` (main-thread wrapper), `worker.ts` (the code
  that actually loads the wasm module and calls it), and `stdinChannel.ts`
  (the SharedArrayBuffer/Atomics protocol behind real-time `input()`). This is
  the "glue" layer between the wasm package and the UI.
- `src/editor/` — CodeMirror language definition, theme, and the static code
  highlighter used on the guide and landing pages.
- `src/ide/` — editor/tab/console state management.
- `src/examples/` — curated example projects, loaded from real `.cuff` files
  via Vite's `?raw` imports.
- `src/styles/` — `base.css` (variables, shared header/buttons, the landing
  and guide pages) and `ide.css` (the IDE workspace only) — `ide.ts` imports
  both, `home.ts`/`guide.ts` import just `base.css`.

## Develop

```bash
npm install
npm run dev
```

`cuffscript-wasm` is published to npm, so a normal install picks it up. To
test against a local engine build instead (e.g. while iterating on the engine
itself), point the dependency at a local path in this repo's `package.json`:

```json
"cuffscript-wasm": "file:../cuffscript/npm"
```

(after running `make wasm` in the `cuffscript` repo so `npm/dist/` is
populated), or use `npm link`.

### Real-time input()

The IDE answers `input()` inline in the console as the program runs, instead
of asking for stdin up front. This needs the page to be [cross-origin
isolated](https://developer.mozilla.org/en-US/docs/Web/API/crossOriginIsolated)
(for `SharedArrayBuffer` + `Atomics.wait`, see `src/engine/stdinChannel.ts`) —
`vite.config.ts` sets the required headers for `dev`/`preview`, and
`public/_headers` does the same for Cloudflare Pages in production. If a
deploy target doesn't honor `public/_headers`, add the equivalent
`Cross-Origin-Opener-Policy: same-origin` /
`Cross-Origin-Embedder-Policy: require-corp` headers there yourself. Without
them, the IDE falls back to the old "type stdin ahead of time" panel
automatically — no code changes needed either way.

## Build

```bash
npm run build
```

Outputs a static site in `dist/` (`index.html`, `ide/index.html`,
`guide/index.html`) that can be hosted anywhere that serves static files with
correct MIME types for `.wasm`. Most static hosts (Netlify, Vercel, Cloudflare
Pages, GitHub Pages) resolve `/ide` and `/guide` to their folder's
`index.html` automatically; if yours doesn't, add a rewrite for
`/ide -> /ide/` and `/guide -> /guide/`.

## License

Apache-2.0 — see [`LICENSE`](LICENSE).
