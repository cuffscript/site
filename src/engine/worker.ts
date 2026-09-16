/// <reference lib="webworker" />
export { };
declare const self: DedicatedWorkerGlobalScope;

import createCuffScriptModule from "cuffscript-wasm";
import type { CuffScriptModule } from "cuffscript-wasm";
import type { CuffFile, RunRequest, WorkerEvent } from "./types";
import { interactiveStdinSupported, openStdinChannel, requestLineBlocking, type StdinChannel } from "./stdinChannel";

let modulePromise: Promise<CuffScriptModule> | null = null;
let currentId = 0;
let stdinBytes: number[] = [];
let stdinPos = 0;
let interactiveChannel: StdinChannel | null = null;

function post(event: WorkerEvent): void {
    self.postMessage(event);
}

function nextStdinByte(): number | null | undefined {
    if (stdinPos < stdinBytes.length) return stdinBytes[stdinPos++];
    if (!interactiveChannel) return null;

    // input() ran out of buffered bytes: ask the main thread for a line and
    // block this worker (not the main thread) until it arrives. If the
    // channel turns out not to actually work here (e.g. this worker didn't
    // inherit cross-origin isolation, so Atomics.wait throws), stop trying
    // for the rest of this run and behave like EOF instead of crashing it.
    try {
        post({ id: currentId, type: "stdin-request" });
        const line = requestLineBlocking(interactiveChannel);
        stdinBytes = Array.from(new TextEncoder().encode(line + "\n"));
        stdinPos = 0;
        return stdinPos < stdinBytes.length ? stdinBytes[stdinPos++] : null;
    } catch {
        interactiveChannel = null;
        post({ id: currentId, type: "stdin-unavailable" });
        return null;
    }
}

function loadModule(): Promise<CuffScriptModule> {
    if (!modulePromise) {
        modulePromise = createCuffScriptModule({
            print: (text: string) => post({ id: currentId, type: "stdout", text }),
            printErr: (text: string) => post({ id: currentId, type: "stderr", text }),
            stdin: nextStdinByte,
        });
    }
    return modulePromise;
}

function removeTree(mod: CuffScriptModule, path: string): void {
    for (const entry of mod.FS.readdir(path)) {
        if (entry === "." || entry === "..") continue;
        const full = `${path}/${entry}`;
        const stat = mod.FS.stat(full);
        if (mod.FS.isDir(stat.mode)) {
            removeTree(mod, full);
            mod.FS.rmdir(full);
        } else {
            mod.FS.unlink(full);
        }
    }
}

function syncFiles(mod: CuffScriptModule, files: CuffFile[]): void {
    const root = "/project";
    if (mod.FS.analyzePath(root).exists) {
        removeTree(mod, root);
    } else {
        mod.FS.mkdirTree(root);
    }
    const encoder = new TextEncoder();
    for (const file of files) {
        const fullPath = `${root}/${file.path}`;
        const dir = fullPath.slice(0, fullPath.lastIndexOf("/"));
        if (dir && dir !== root) mod.FS.mkdirTree(dir);
        mod.FS.writeFile(fullPath, encoder.encode(file.content));
    }
}

self.onmessage = async (event: MessageEvent<RunRequest>) => {
    const req = event.data;
    currentId = req.id;
    stdinBytes = Array.from(new TextEncoder().encode(req.stdin));
    stdinPos = 0;
    interactiveChannel = req.stdinBuffer && interactiveStdinSupported() ? openStdinChannel(req.stdinBuffer) : null;

    const entryFile = req.files.find((f) => f.path === req.entryPath);
    if (!entryFile) {
        post({ id: req.id, type: "fatal", message: `entry file not found: ${req.entryPath}` });
        return;
    }

    try {
        const mod = await loadModule();
        syncFiles(mod, req.files);
        const entryFull = `${"/project"}/${req.entryPath}`;
        const scriptDir = entryFull.slice(0, entryFull.lastIndexOf("/")) || "/project";

        const start = performance.now();
        const outcome =
            req.mode === "ast"
                ? mod.cuffDump(entryFile.content)
                : mod.cuffRun(entryFile.content, scriptDir);
        const elapsedMs = performance.now() - start;

        post({
            id: req.id,
            type: "done",
            success: outcome.success,
            error: outcome.error,
            elapsedMs,
        });
    } catch (err) {
        post({ id: req.id, type: "fatal", message: err instanceof Error ? err.message : String(err) });
    }
};
