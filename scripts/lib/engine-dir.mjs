import path from "node:path";

/** Where the engine checkout may live, best guess first: an explicit path, $CUFFSCRIPT_ENGINE, then a sibling folder. */
export function engineCandidates(root, explicit) {
    return [explicit, process.env.CUFFSCRIPT_ENGINE, path.join(root, "../cuffscript"), path.join(root, "../cuffscript-main")].filter(Boolean);
}
