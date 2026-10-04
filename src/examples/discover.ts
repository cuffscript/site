// Turns the raw example sources found in src/examples into IDE example projects.
// Pure (no imports of Vite features) so it can be unit-tested under Node.
import type { CuffFile } from "../engine/types";

export interface ExampleProject {
    id: string;
    label: string;
    entryPath: string;
    files: CuffFile[];
}

export const ENTRY_FILE = "main.cuff";

/**
 * `raw` maps import.meta.glob keys ("./01_hello.cuff", "./09_modules/lib/x.cuff")
 * to file contents. Conventions (so adding an example never needs a code change):
 *   NN_name.cuff            single-file example, shown as main.cuff
 *   NN_name/main.cuff ...   multi-file example; any other *.cuff files at any depth
 * Order is the numeric NN_ prefix. `labels` maps "NN_name" to the menu text; a
 * missing entry falls back to "N. name".
 */
export function buildExamples(raw: Readonly<Record<string, string>>, labels: Readonly<Record<string, string>>): ExampleProject[] {
    const bySlug = new Map<string, CuffFile[]>();
    for (const [key, content] of Object.entries(raw)) {
        const rel = key.replace(/^\.\//, "");
        const slash = rel.indexOf("/");
        const slug = slash === -1 ? rel.replace(/\.cuff$/, "") : rel.slice(0, slash);
        const path = slash === -1 ? ENTRY_FILE : rel.slice(slash + 1);
        const files = bySlug.get(slug) ?? [];
        files.push({ path, content });
        bySlug.set(slug, files);
    }

    return [...bySlug.entries()]
        .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
        .map(([slug, files]) => {
            if (!files.some((f) => f.path === ENTRY_FILE)) {
                throw new Error(`example "${slug}" has no ${ENTRY_FILE} (multi-file examples need one as the entry point)`);
            }
            const prefixed = /^(\d+)_(.*)$/.exec(slug);
            const humanized = prefixed ? `${Number(prefixed[1])}. ${(prefixed[2] ?? "").replace(/_/g, " ")}` : slug;
            return {
                id: slug.replace(/^\d+_/, "").replace(/_/g, "-"),
                label: labels[slug] ?? humanized,
                entryPath: ENTRY_FILE,
                files: files.sort((a, b) => (a.path === ENTRY_FILE ? -1 : b.path === ENTRY_FILE ? 1 : a.path.localeCompare(b.path, "en"))),
            };
        });
}
