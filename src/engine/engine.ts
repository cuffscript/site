import type { CuffFile, RunMode, RunRequest, WorkerEvent } from "./types";

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

        const request: RunRequest = {
            id,
            mode: options.mode ?? "run",
            entryPath: options.entryPath,
            files: options.files,
            stdin: options.stdin ?? "",
        };

        const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.timeoutHandle = window.setTimeout(() => {
            if (this.activeId === id) {
                callbacks.onFatal?.(
                    `실행 시간이 ${Math.round(timeoutMs / 1000)}초를 넘어 자동으로 중단했습니다. 무한 루프가 없는지 확인해 보세요.`,
                );
                this.stop();
            }
        }, timeoutMs);

        this.worker.postMessage(request);
    }

    stop(): void {
        if (this.timeoutHandle !== undefined) {
            window.clearTimeout(this.timeoutHandle);
            this.timeoutHandle = undefined;
        }
        this.worker?.terminate();
        this.worker = null;
        this.activeId = null;
    }

    get isRunning(): boolean {
        return this.activeId !== null;
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
