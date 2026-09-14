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
    | { id: number; type: "done"; success: boolean; error: string; elapsedMs: number }
    | { id: number; type: "fatal"; message: string };
