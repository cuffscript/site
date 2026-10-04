# CuffScript website

![HTML](https://img.shields.io/badge/HTML-E34F26?style=flat&logo=html5&logoColor=white)
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

The text of the landing page and the guide is **not** written in HTML: it lives
in `content/` as Markdown and is turned into HTML at build time (see
[Content](#content)). `index.html` and `guide/index.html` are thin shells with
placeholders.

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
- `src/examples/` — curated example projects. They are discovered from the
  folder (`NN_name.cuff`, or `NN_name/main.cuff` + more files); drop a file in
  and it appears in the IDE menu. Menu text is in `labels.json`.
- `content/` — the guide and landing-page text, as Markdown.
- `scripts/` — build-time tooling with no dependencies (Markdown converter,
  Vite plugin, engine metadata extractor, engine compatibility checker) and its
  tests in `scripts/test/`.
- `src/generated/engine-meta.json` — keywords, built-in functions and error
  codes of the engine, generated from its source. Committed; do not edit.
- `src/styles/` — `base.css` (variables, shared header/buttons, the landing
  and guide pages) and `ide.css` (the IDE workspace only) — `ide.ts` imports
  both, `home.ts`/`guide.ts` import just `base.css`.

## Develop

```bash
npm install
npm run dev     # editing content/**/*.md reloads the page
npm test        # unit tests for the content pipeline (Node 22+)
```

`cuffscript-wasm` is published to npm, so a normal install picks it up. To
test against a local engine build instead (e.g. while iterating on the engine
itself), point the dependency at a local path in this repo's `package.json`:

```json
"cuffscript-wasm": "file:../cuffscript/npm"
```

(after running `make wasm` in the `cuffscript` repo so `npm/dist/` is
populated), or use `npm link`.

## Content

Write and edit the guide and the landing page in `content/` — see
[`content/README.md`](content/README.md) (in Korean) for the syntax and the
common tasks. In short: one Markdown file per guide group / landing-page card;
the table of contents, the landing page's "docs" grid and the reference tables
are generated; counts such as "10 libraries" are variables (`{{engine.dlcCount}}`)
instead of numbers typed by hand.

`vite.config.ts` loads `scripts/vite-plugin-content.mjs`, which fills the
`<!--@guide:...-->` / `<!--@home:...-->` placeholders in the page shells. To
look at the generated HTML without Vite: `npm run content -- guide`.

## Staying compatible with the engine

The site follows the engine instead of being updated by hand:

- `npm run sync:engine -- ../cuffscript` reads the engine's **source** and
  regenerates `src/generated/engine-meta.json` (keywords, library functions,
  error codes). If a built `cuffc` is next to it, every function is also
  checked against the real binary. Code highlighting and the generated
  reference tables follow automatically.
- `npm run check:engine -- --cuffc ../cuffscript/cuffc` runs every `cuff` code
  block in `content/` and every IDE example against the real engine, compares
  documented output, checks that functions mentioned in the text exist, and
  that the generated metadata is up to date. It points at the exact file and
  line of anything that no longer works.
- `.github/workflows/engine-compat.yml` runs both against the engine's `main`
  branch every week, so drift is reported without anyone remembering to look.
- The live "latest news" card on the landing page reads the engine's
  `docs/CHANGELOG.md` from GitHub in the browser (`src/newsFeed.ts`).
- Libraries the browser IDE refuses to run (currently `filesystem`) are listed
  in `src/engine/webPolicy.json`; the guide's tables mention it automatically.

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
