// How the error reference page (/errors/) searches. Kept apart from the page so it can be tested.

/** "DivisionByZero" -> "Division By Zero", so that someone searching by words finds the name. */
export function spaced(name: string): string {
    return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

/** The text a search looks through for one error: its code, its name, and the prose and report under it. */
export function buildHaystack(code: string, name: string, body: string): string {
    return `${code} ${code.replace("-", "")} ${name} ${spaced(name)} ${body}`.toLowerCase().replace(/\s+/g, " ");
}

/**
 * Splits what was typed into words that must all be found. A pasted report line
 * ("ERROR: [E4-006] Runtime Error at line 3 …") is searched by its code alone, and a code may be
 * typed with or without its dash ("E4-006", "e4006").
 */
export function normaliseQuery(query: string): string[] {
    const tag = /\bE\d-?\d{3}\b/i.exec(query);
    if (tag) return [tag[0].toLowerCase().replace("-", "")];
    return query
        .toLowerCase()
        .replace(/[^a-z0-9\-\s_]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => (/^e\d-\d{1,3}$/.test(t) ? t.replace("-", "") : t));
}

export function entryMatches(haystack: string, entryCategory: string, wantedCategory: string, tokens: string[]): boolean {
    if (wantedCategory && entryCategory !== wantedCategory) return false;
    return tokens.every((t) => haystack.includes(t));
}
