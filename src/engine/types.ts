export interface CuffFile {
    path: string;
    content: string;
}

export type RunMode = "run" | "ast";

export interface RunRequest {
    id: number;
    mode: RunMode;
    entryPath: string;
    files: CuffFile[];
    stdin: string;
    // Present only when interactiveStdinSupported() — see stdinChannel.ts.
    // When present, worker.ts blocks on it instead of consuming `stdin`.
    stdinBuffer?: SharedArrayBuffer;
}

export type WorkerEvent =
    | { id: number; type: "stdout"; text: string }
    | { id: number; type: "stderr"; text: string }
    | { id: number; type: "stdin-request" }
    // The worker discovered it can't actually use the interactive channel
    // it was given (e.g. it didn't inherit cross-origin isolation) — sent
    // once per run, right before falling back to treating input() as EOF.
    | { id: number; type: "stdin-unavailable" }
    | { id: number; type: "done"; success: boolean; error: string; elapsedMs: number }
    | { id: number; type: "fatal"; message: string };
