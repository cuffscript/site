// Turns the engine's CHANGELOG.md into the short entries shown in the home page's
// "최신 소식" card. Pure and import-free so it can be unit-tested directly under Node.
//
// The changelog is untrusted input as far as this page is concerned: everything is
// HTML-escaped first, and only inline code / bold are re-enabled afterwards.

export interface ParseOptions {
    /** How many releases (newest first) to return. */
    maxEntries: number;
    /** Longest summary, in characters; longer ones are cut at a word boundary with "…". */
    summaryMaxLen: number;
}

export interface ChangelogEntry {
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

export function parseChangelog(markdown: string, options: ParseOptions): ChangelogEntry[] {
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
    for (let i = 0; i < headers.length && entries.length < options.maxEntries; i++) {
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
            summaryHtml: renderInlineMarkdown(escapeHtml(picked), options.summaryMaxLen),
        });
    }
    return entries;
}
