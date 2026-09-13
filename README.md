# CuffScript website

Browser IDE for [CuffScript](https://github.com/cuffscript/cuffscript): a code
editor, multi-file projects, stdin, an AST/token viewer, and a full language
guide — built with Vite + TypeScript + CodeMirror 6.

This repository is the **website only**. The compiled engine itself
(`cuffscript.mjs` / `cuffscript.wasm`) is published separately as the
[`cuffscript-wasm`](https://www.npmjs.com/package/cuffscript-wasm) npm package
from the main `cuffscript` repository and consumed here as an ordinary
dependency.

## Structure

- `index.html` / `src/main.ts` — the IDE.
- `guide.html` / `src/guide.ts` — the language guide.
- `src/engine/` — `engine.ts` (main-thread wrapper) and `worker.ts` (the code
  that actually loads the wasm module and calls it). This is the "glue" layer
  between the wasm package and the UI.
- `src/editor/` — CodeMirror language definition, theme, and the guide page's
  static code highlighter.
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

Outputs a static site in `dist/` (two entry points: `index.html`,
`guide.html`) that can be hosted anywhere that serves static files with
correct MIME types for `.wasm`.

## License

Apache-2.0 — see `LICENSE`.
