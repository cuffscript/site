import { icons } from "./icons";
import { initColorScheme, toggleColorScheme } from "./colorScheme";

export type NavKey = "home" | "ide" | "guide";

const BRAND_MARK = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <path d="M43.294 55a24.745 23.277-44.124 0 1 25.468-24h410a16.497 15.518-44.124 0 1 15.021 16l-25.077 410a24.745 23.277-44.124 0 1-25.468 24h-410a16.497 15.518-44.124 0 1-15.021-16Z" fill="#008f6b"/>
  <text x="462" y="465" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Arial', sans-serif" font-size="208" font-weight="700" font-style="italic" letter-spacing="-13" fill="#fff" text-anchor="end" dominant-baseline="ideographic">CS</text>
</svg>`;

function navAttr(key: NavKey, active: NavKey): string {
  return key === active ? ' aria-current="page"' : "";
}

// initColorScheme() must run before this (as early as possible, to avoid a
// theme flash) — call it at the top of each page's entry file, then call
// this to inject the header and wire up the toggle.
export function renderHeader(active: NavKey): void {
  const root = document.getElementById("site-header-root");
  if (!root) return;

  root.innerHTML = `
    <header class="site-header">
      <a class="brand" href="/">${BRAND_MARK}<span>CuffScript</span></a>
      <nav class="site-nav">
        <a href="/ide/"${navAttr("ide", active)}>IDE</a>
        <a href="/guide/"${navAttr("guide", active)}>가이드</a>
      </nav>
      <div class="header-spacer"></div>
      <div class="header-actions">
        <a
          id="github-link"
          class="icon-btn"
          href="https://github.com/cuffscript/cuffscript"
          target="_blank"
          rel="noreferrer"
          title="GitHub 저장소"
        >${icons.external}</a>
        <button id="theme-toggle" class="icon-btn" type="button" title="테마 전환"></button>
      </div>
    </header>
  `;

  const themeToggle = document.getElementById("theme-toggle") as HTMLButtonElement;
  const renderThemeIcon = () => {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    themeToggle.innerHTML = dark ? icons.sun : icons.moon;
  };
  renderThemeIcon();
  themeToggle.addEventListener("click", () => {
    toggleColorScheme();
    renderThemeIcon();
  });
}

export { initColorScheme };
