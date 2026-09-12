import type { CuffFile } from "../engine/types";

export interface ProjectState {
    files: CuffFile[];
    activeFile: string;
    stdin: string;
}

const STORAGE_KEY = "cuffscript-ide:project";

export function defaultProject(): ProjectState {
    return {
        files: [{ path: "main.cuff", content: 'print("Hello, CuffScript!")\n' }],
        activeFile: "main.cuff",
        stdin: "",
    };
}

function isValidProject(value: unknown): value is ProjectState {
    if (!value || typeof value !== "object") return false;
    const project = value as ProjectState;
    return (
        Array.isArray(project.files) &&
        project.files.length > 0 &&
        project.files.every((f) => typeof f.path === "string" && typeof f.content === "string") &&
        typeof project.activeFile === "string"
    );
}

export function loadProject(): ProjectState {
    const fromHash = decodeFromHash();
    if (fromHash) return fromHash;

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (isValidProject(parsed)) return parsed;
        }
    } catch {
        // malformed or unavailable storage — fall through to the default project
    }
    return defaultProject();
}

export function saveProject(project: ProjectState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
        // private browsing / quota exceeded — persistence is best-effort only
    }
}

function toBase64Url(bytes: Uint8Array): string {
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
    const restored = text.replace(/-/g, "+").replace(/_/g, "/");
    const padded = restored + "===".slice((restored.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

export function buildShareUrl(project: ProjectState): string {
    const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(project)));
    const url = new URL(window.location.href);
    url.hash = `p=${encoded}`;
    return url.toString();
}

function decodeFromHash(): ProjectState | null {
    const hash = window.location.hash.replace(/^#/, "");
    const match = /(?:^|&)p=([^&]+)/.exec(hash);
    const encoded = match?.[1];
    if (!encoded) return null;
    try {
        const json = new TextDecoder().decode(fromBase64Url(encoded));
        const parsed = JSON.parse(json);
        return isValidProject(parsed) ? parsed : null;
    } catch {
        return null;
    }
}
