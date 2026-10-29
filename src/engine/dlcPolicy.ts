// Which DLC libraries this web IDE refuses to run, and how it says so.
//
// The list itself lives in webPolicy.json (edit that, not this file). The reason
// this is enforced here rather than inside the engine: the WebAssembly build's
// cuffRun() cannot be told `filesystemEnabled: false` / `networkEnabled: false`
// (bindings.cpp calls CuffEngine::execute() with default options), so the host
// checks the project's source before the module is even loaded.
//
// Kept free of runtime imports so it can be unit-tested directly under Node.
import type { CuffFile } from "./types";

/** DLC name -> why it is unavailable here (shown to the person who tried to use it). */
export type BlockedDlcs = Readonly<Record<string, string>>;

export interface BlockedUsage {
    dlc: string;
    reason: string;
    path: string;
    /** 1-based line number of the offending `use DLC:...` statement. */
    line: number;
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Finds the first `use DLC:<blocked>` declaration in ANY file of the project
 * (modules count too: an imported file may pull the library in). Mentions in
 * comments or strings don't match because the statement must start the line.
 */
export function findBlockedDlcUsage(files: readonly CuffFile[], blocked: BlockedDlcs): BlockedUsage | null {
    const names = Object.keys(blocked);
    if (names.length === 0) return null;
    const re = new RegExp(`^use\\s+DLC\\s*:\\s*(${names.map(escapeRegExp).join("|")})\\b`);
    for (const file of files) {
        for (const [idx, line] of file.content.split("\n").entries()) {
            const dlc = re.exec(line.trim())?.[1];
            if (dlc !== undefined) {
                return { dlc, reason: blocked[dlc] ?? "", path: file.path, line: idx + 1 };
            }
        }
    }
    return null;
}

/** Formatted like the engine's own errors; `errorTag` is the engine's tag for "DLC feature unavailable". */
export function formatBlockedError(usage: BlockedUsage, errorTag: string): string {
    return (
        `ERROR: [${errorTag}] Module Error: The DLC:${usage.dlc} library is disabled in this browser IDE.\n` +
        `    at ${usage.path}, line ${usage.line} — use DLC:${usage.dlc}\n` +
        `    hint: ${usage.reason}`
    );
}
