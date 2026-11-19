import fs from "node:fs";
import path from "node:path";

/**
 * Whether the installed cuffscript-wasm can show bytecode, that is, whether it exports `cuffBytecode`.
 * The names of the functions a build exports are plain text inside its .wasm file.
 */
export function engineCanShowBytecode(root) {
    try {
        return fs.readFileSync(path.join(root, "node_modules/cuffscript-wasm/dist/cuffscript.wasm")).includes("cuffBytecode");
    } catch {
        return false;
    }
}
