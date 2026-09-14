import type { CuffFile, RunMode, RunRequest, WorkerEvent } from "./types";
import {
    createStdinBuffer,
    interactiveStdinSupported,
    openStdinChannel,
    provideLine,
    type StdinChannel,
} from "./stdinChannel";

export interface RunOptions {
    entryPath: string;
    files: CuffFile[];
    stdin?: string;
    mode?: RunMode;
    timeoutMs?: number;
}

export interface RunCallbacks {
    onStdout?: (text: string) => void;
    onStderr?: (text: string) => void;
    // Fired when the running program calls input() and is now blocked
    // waiting for a line — only ever fires when isInteractive is true.
    onStdinRequest?: () => void;
    onDone?: (result: { success: boolean; error: string; elapsedMs: number }) => void;
    onFatal?: (message: string) => void;
}

const DEFAULT_TIMEOUT_MS = 8000;

export class CuffEngine {
    private worker: Worker | null = null;
    private nextId = 1;
    private activeId: number | null = null;
    private callbacks: RunCallbacks | null = null;
    private timeoutHandle: number | undefined;
    private timeoutMs = DEFAULT_TIMEOUT_MS;
    private stdinChannel: StdinChannel | null = null;

    // True when the page is cross-origin isolated and can use
    // SharedArrayBuffer + Atomics — see public/_headers and vite.config.ts.
    get isInteractive(): boolean {
        return interactiveStdinSupported();
    }

    get isRunning(): boolean {
        return this.activeId !== null;
    }

    run(options: RunOptions, callbacks: RunCallbacks): void {
        this.stop();

        this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
        this.worker.onmessage = (event: MessageEvent<WorkerEvent>) => this.handleMessage(event.data);
        this.worker.onerror = (event: ErrorEvent) => {
            callbacks.onFatal?.(event.message || "워커에서 알 수 없는 오류가 발생했습니다.");
            this.stop();
        };

        this.callbacks = callbacks;
        const id = this.nextId++;
        this.activeId = id;
        this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

        let stdinBuffer: SharedArrayBuffer | undefined;
        if (this.isInteractive) {
            stdinBuffer = createStdinBuffer();
            this.stdinChannel = openStdinChannel(stdinBuffer);
        } else {
            this.stdinChannel = null;
        }

        const request: RunRequest = {
            id,
            mode: options.mode ?? "run",
            entryPath: options.entryPath,
            files: options.files,
            stdin: options.stdin ?? "",
            stdinBuffer,
        };

        this.armTimeout(id);
        this.worker.postMessage(request);
    }

    // Called by the UI once the person submits a line for a pending
    // onStdinRequest. Resumes the run timeout since computation continues.
    provideStdin(text: string): void {
        if (!this.stdinChannel || this.activeId === null) return;
        provideLine(this.stdinChannel, text);
        this.armTimeout(this.activeId);
    }

    stop(): void {
        this.clearTimeoutHandle();
        this.worker?.terminate();
        this.worker = null;
        this.activeId = null;
        this.stdinChannel = null;
    }

    private armTimeout(id: number): void {
        this.clearTimeoutHandle();
        this.timeoutHandle = window.setTimeout(() => {
            if (this.activeId === id) {
                this.callbacks?.onFatal?.(
                    `실행 시간이 ${Math.round(this.timeoutMs / 1000)}초를 넘어 자동으로 중단했습니다. 무한 루프가 없는지 확인해 보세요.`,
                );
                this.stop();
            }
        }, this.timeoutMs);
    }

    private handleMessage(event: WorkerEvent): void {
        if (event.id !== this.activeId) return;
        switch (event.type) {
            case "stdout":
                this.callbacks?.onStdout?.(event.text);
                break;
            case "stderr":
                this.callbacks?.onStderr?.(event.text);
                break;
            case "stdin-request":
                // Paused until provideStdin() is called — no point counting
                // toward the run timeout while we wait on the person.
                this.clearTimeoutHandle();
                this.callbacks?.onStdinRequest?.();
                break;
            case "done":
                this.clearTimeoutHandle();
                this.activeId = null;
                this.callbacks?.onDone?.({
                    success: event.success,
                    error: event.error,
                    elapsedMs: event.elapsedMs,
                });
                break;
            case "fatal":
                this.clearTimeoutHandle();
                this.activeId = null;
                this.callbacks?.onFatal?.(event.message);
                break;
        }
    }

    private clearTimeoutHandle(): void {
        if (this.timeoutHandle !== undefined) {
            window.clearTimeout(this.timeoutHandle);
            this.timeoutHandle = undefined;
        }
    }
}
