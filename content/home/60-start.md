---
id: start
title: 시작하기
---

설치 없이 바로 써보거나, 프로젝트에 엔진을 직접 가져다 쓸 수 있습니다.

### 1. 설치 없이 브라우저에서

이 사이트의 IDE는 CuffScript 엔진을 WebAssembly로 그대로 담고 있어, 아무것도 설치하지 않고 바로 실행해 볼 수 있습니다.

<div class="home-cta">
<a class="btn btn-primary" href="/ide/">IDE 열기</a>
</div>

### 2. JS/TS 프로젝트에 임베드

`cuffscript-wasm` 패키지로 Node나 브라우저 어디서든 CuffScript를 실행할 수 있습니다.

```
npm install cuffscript-wasm
```

### 3. 네이티브 CLI 직접 빌드

C++17 컴파일러만 있으면 소스에서 바로 `cuffc`를 빌드할 수 있습니다. (아직 배포판 바이너리는 제공하지 않습니다.) 파일 읽기/쓰기(`DLC:filesystem`)는 이 네이티브 CLI에서만 쓸 수 있고, 브라우저 IDE에서는 막혀 있습니다.

```vars
git clone {{site.cloneUrl}}
cd {{site.repoName}}
make
./cuffc your_script.cuff
```

::: p home-start-footnote
더 자세한 문법은 [언어 가이드](/guide/)에서, 변경 이력은 [CHANGELOG]({{site.changelogUrl}})에서 확인할 수 있습니다.
:::
