// Renders the "최신 소식" card on the home page by fetching the real
// CHANGELOG.md straight from GitHub at runtime, so this section can never
// drift out of sync with the engine the way the rest of the site once did.
//
// raw.githubusercontent.com serves with permissive CORS (Access-Control-
// Allow-Origin: *) and sits behind a CDN, so a plain client-side fetch is
// fine here — no API token, and none of api.github.com's low rate limits.

const CHANGELOG_RAW_URL =
    "https://raw.githubusercontent.com/cuffscript/cuffscript/main/docs/CHANGELOG.md";
const CHANGELOG_BLOB_URL =
    "https://github.com/cuffscript/cuffscript/blob/main/docs/CHANGELOG.md";

const MAX_ENTRIES = 3;
const SUMMARY_MAX_LEN = 200;
const CACHE_KEY = "cuffscript-site:changelog-feed:v1";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes — avoid refetching on every page view

interface ChangelogEntry {
    version: string;
    date: string;
    /** Already-escaped, already-truncated safe HTML (text + <code>/<strong> only). */
    summaryHtml: string;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Applies a tiny, safe subset of markdown (inline code, bold) to text that
 * has ALREADY been HTML-escaped, then truncates to a word boundary. Because
 * escaping runs first, nothing in the fetched markdown can inject arbitrary
 * tags — only literal backticks/asterisks from the escaped text drive this.
 */
function renderInlineMarkdown(escaped: string, maxLen: number): string {
    let text = escaped;
    if (text.length > maxLen) {
        text = text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
    }
    return text
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

/** Splits a changelog section into its top-level "- " bullets, joining wrapped lines. */
function extractBullets(block: string): string[] {
    const bullets: string[] = [];
    let current: string[] | null = null;

    for (const raw of block.split("\n")) {
        const line = raw.trimEnd();
        if (line.startsWith("- ")) {
            if (current) bullets.push(current.join(" "));
            current = [line.slice(2).trim()];
        } else if (line.trim() === "" || line.trim() === "---") {
            if (current) bullets.push(current.join(" "));
            current = null;
        } else if (current) {
            current.push(line.trim());
        }
    }
    if (current) bullets.push(current.join(" "));
    return bullets.filter(Boolean);
}

// Prefers a bullet that announces something new (tolerating a leading "**"
// from markdown bold) over the first bullet, which is often a lower-level
// internal fix rather than the most homepage-worthy change in the release.
const PRIORITY_RE = /^\*{0,2}(New|Added|Keyword)\b/i;

function parseChangelog(markdown: string): ChangelogEntry[] {
    const headerRe = /^## v(\d+\.\d+\.\d+)\s*-\s*(\d{4}-\d{2}-\d{2})\s*$/gm;
    const headers: { version: string; date: string; contentStart: number; blockStart: number }[] = [];

    let m: RegExpExecArray | null;
    while ((m = headerRe.exec(markdown)) !== null) {
        const version = m[1];
        const date = m[2];
        // The regex's two capture groups are both mandatory (no "?"), so a
        // successful match always populates them — this guard only exists
        // to satisfy noUncheckedIndexedAccess, not because it can fail.
        if (version === undefined || date === undefined) continue;
        headers.push({
            version,
            date,
            blockStart: m.index,
            // lastIndex (rather than m[0].length) sidesteps another
            // possibly-undefined index access on the match array.
            contentStart: headerRe.lastIndex,
        });
    }

    const entries: ChangelogEntry[] = [];
    for (let i = 0; i < headers.length && entries.length < MAX_ENTRIES; i++) {
        const header = headers[i];
        if (!header) continue;
        const { version, date, contentStart } = header;

        const nextHeader = headers[i + 1];
        const blockEnd = nextHeader ? nextHeader.blockStart : markdown.length;
        const block = markdown.slice(contentStart, blockEnd).replace(/^\s*## Description\s*\n/i, "");

        const bullets = extractBullets(block);
        const fallback = bullets[0];
        if (fallback === undefined) continue; // no bullets in this section — skip it

        const picked = bullets.find((b) => PRIORITY_RE.test(b)) ?? fallback;
        entries.push({
            version,
            date,
            summaryHtml: renderInlineMarkdown(escapeHtml(picked), SUMMARY_MAX_LEN),
        });
    }
    return entries;
}

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
        const entries = parseChangelog(markdown);
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
