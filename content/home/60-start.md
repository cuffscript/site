---
id: start
title: Get started
---

Try it right away without installing anything, or bring the engine into your own project.

### 1. In the browser, with nothing to install

The IDE on this site runs the CuffScript engine itself, compiled to WebAssembly, so you can run code immediately without installing anything.

<div class="home-cta">
<a class="btn btn-primary" href="/ide/">Open the IDE</a>
</div>

### 2. Embed in a JS/TS project

With the `cuffscript-wasm` package you can run CuffScript anywhere, in Node or in the browser.

```
npm install cuffscript-wasm
```

### 3. Build the native CLI yourself

With just a C++17 compiler you can build `cuffc` straight from source. (Prebuilt binaries aren't provided yet.) File reading and writing (`DLC:filesystem`) is available only in this native CLI; it is blocked in the browser IDE.

```vars
git clone {{site.cloneUrl}}
cd {{site.repoName}}
make
./cuffc your_script.cuff
```

::: p home-start-footnote
For more on the syntax, see the [language guide](/guide/); for the history of changes, see the [CHANGELOG]({{site.changelogUrl}}).
:::
