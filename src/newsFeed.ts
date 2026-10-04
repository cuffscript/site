// Renders the "최신 소식" card on the home page by fetching the real
// CHANGELOG.md straight from GitHub at runtime, so this section can never
// drift out of sync with the engine the way the rest of the site once did.
//
// raw.githubusercontent.com serves with permissive CORS (Access-Control-
// Allow-Origin: *) and sits behind a CDN, so a plain client-side fetch is
// fine here — no API token, and none of api.github.com's low rate limits.
//
// Which repository / branch / how many entries comes from siteConfig.json.
import siteConfig from "./siteConfig.json";
import { parseChangelog, type ChangelogEntry } from "./changelog";

const CHANGELOG_PATH = "docs/CHANGELOG.md";
const CHANGELOG_RAW_URL = `https://raw.githubusercontent.com/${siteConfig.repo}/${siteConfig.branch}/${CHANGELOG_PATH}`;
const CHANGELOG_BLOB_URL = `https://github.com/${siteConfig.repo}/blob/${siteConfig.branch}/${CHANGELOG_PATH}`;

const PARSE_OPTIONS = { maxEntries: siteConfig.newsCount, summaryMaxLen: 200 };
const CACHE_KEY = `cuffscript-site:changelog-feed:v1:${siteConfig.newsCount}`;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes — avoid refetching on every page view

function entriesHtml(entries: ChangelogEntry[]): string {
    return entries
        .map(
            (e) => `<li>
                <div class="home-news-meta"><span class="home-news-version">v${e.version}</span><span class="home-news-date">${e.date}</span></div>
                <p>${e.summaryHtml}</p>
            </li>`
        )
        .join("");
}

function readCache(): ChangelogEntry[] | null {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { at: number; entries: ChangelogEntry[] };
        if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
        return parsed.entries;
    } catch {
        return null; // private-browsing / storage disabled — just refetch
    }
}

function writeCache(entries: ChangelogEntry[]): void {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), entries }));
    } catch {
        // storage full or disabled — fine, this is just an optimization
    }
}

export async function renderNewsFeed(listEl: HTMLElement, stateEl: HTMLElement): Promise<void> {
    const cached = readCache();
    if (cached && cached.length > 0) {
        listEl.innerHTML = entriesHtml(cached);
        stateEl.hidden = true;
        return;
    }

    try {
        const res = await fetch(CHANGELOG_RAW_URL);
        if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
        const markdown = await res.text();
        const entries = parseChangelog(markdown, PARSE_OPTIONS);
        if (entries.length === 0) throw new Error("no version headers found");

        listEl.innerHTML = entriesHtml(entries);
        stateEl.hidden = true;
        writeCache(entries);
    } catch {
        listEl.innerHTML = "";
        stateEl.hidden = false;
        stateEl.innerHTML = `최신 소식을 불러오지 못했습니다. <a href="${CHANGELOG_BLOB_URL}" target="_blank" rel="noreferrer">GitHub에서 CHANGELOG 직접 보기 →</a>`;
    }
}
