# site

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

- `src/engine/` — `engine.ts` (main-thread wrapper) and `worker.ts` (the code
  that actually loads the wasm module and calls it). This is the "glue" layer
  between the wasm package and the UI.
- `src/editor/` — CodeMirror language definition, theme, and the static code
  highlighter used on the guide and landing pages.
- `src/ide/` — editor/tab/console state management.
- `src/examples/` — curated example projects, loaded from real `.cuff` files
  via Vite's `?raw` imports.

## Develop

```bash
npm install
npm run dev
```

Until `cuffscript-wasm` is published, point it at a local build instead of a
registry version, e.g. from this repo's `package.json`:

```json
"cuffscript-wasm": "file:../cuffscript/npm"
```

(after running `make wasm` in the `cuffscript` repo so `npm/dist/` is
populated), or use `npm link`. Switch back to a normal semver range once the
package is actually published.

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

Apache-2.0 — see `LICENSE`.
