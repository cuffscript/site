import "./styles/base.css";
import "./styles/ide.css";
import { initColorScheme } from "./ui/colorScheme";
import { renderHeader } from "./ui/header";
import { icons } from "./ui/icons";
import { EditorManager } from "./ide/editorManager";
import { ConsoleView } from "./ide/console";
import { TabBar } from "./ide/tabs";
import { initResizeHandle } from "./ide/resizer";
import { CuffEngine } from "./engine/engine";
import { loadProject, saveProject, buildShareUrl, type ProjectState } from "./ide/state";
import { EXAMPLES } from "./examples";
import type { RunMode } from "./engine/types";

function el<T extends HTMLElement>(id: string): T {
    const found = document.getElementById(id);
    if (!found) throw new Error(`missing element #${id}`);
    return found as T;
}

initColorScheme();
renderHeader("ide");

const exampleSelect = el<HTMLSelectElement>("example-select");
const runBtn = el<HTMLButtonElement>("run-btn");
const stopBtn = el<HTMLButtonElement>("stop-btn");
const astBtn = el<HTMLButtonElement>("ast-btn");
const runStatus = el<HTMLElement>("run-status");
const shareBtn = el<HTMLButtonElement>("share-btn");
const downloadBtn = el<HTMLButtonElement>("download-btn");
const tabBarEl = el<HTMLElement>("tab-bar");
const editorHost = el<HTMLElement>("editor-host");
const consoleEl = el<HTMLElement>("console");
const stdinInput = el<HTMLTextAreaElement>("stdin-input");

runBtn.innerHTML = `${icons.play}<span>Run</span>`;
stopBtn.innerHTML = `${icons.stop}<span>Stop</span>`;
astBtn.innerHTML = `${icons.tree}<span>View AST</span>`;
shareBtn.innerHTML = `${icons.link}<span>Share link</span>`;
downloadBtn.innerHTML = `${icons.download}<span>Download</span>`;

for (const example of EXAMPLES) {
    const option = document.createElement("option");
    option.value = example.id;
    option.textContent = example.label;
    exampleSelect.appendChild(option);
}

const project: ProjectState = loadProject();
const consoleView = new ConsoleView(consoleEl);
const editor = new EditorManager(editorHost);
const engine = new CuffEngine();

const stdinDiagnostic = el<HTMLElement>("stdin-diagnostic");
function renderStdinDiagnostic(available: boolean): void {
    stdinDiagnostic.textContent = available
        ? "\u2713 This browser supports live input."
        : "\u2717 Live input isn't supported in this browser/deployment, so the contents of this tab are used.";
}
renderStdinDiagnostic(engine.isInteractive);

let saveTimer: number | undefined;
function scheduleSave(): void {
    if (saveTimer !== undefined) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveProject(project), 400);
}

function renderTabs(): void {
    tabBar.render(editor.listPaths(), editor.currentPath);
}

const tabBar = new TabBar(tabBarEl, {
    onSelect: (path) => {
        editor.switchTo(path);
        project.activeFile = path;
        renderTabs();
        scheduleSave();
    },
    onAdd: () => {
        const input = window.prompt("Enter a new file path (e.g. lib/util.cuff)", "lib/util.cuff");
        if (!input) return;
        let path = input.trim();
        if (!path) return;
        if (!path.endsWith(".cuff")) path += ".cuff";
        if (editor.hasFile(path)) {
            window.alert("That file path already exists.");
            return;
        }
        editor.addFile(path, "");
        project.files.push({ path, content: "" });
        editor.switchTo(path);
        project.activeFile = path;
        renderTabs();
        scheduleSave();
    },
    onClose: (path) => {
        if (editor.listPaths().length <= 1) return;
        const wasActive = editor.currentPath === path;
        editor.removeFile(path);
        project.files = project.files.filter((f) => f.path !== path);
        if (wasActive) {
            const fallback = editor.listPaths()[0];
            if (fallback) {
                editor.switchTo(fallback);
                project.activeFile = fallback;
            }
        }
        renderTabs();
        scheduleSave();
    },
});

editor.onChange((path, content) => {
    const file = project.files.find((f) => f.path === path);
    if (file) file.content = content;
    scheduleSave();
});

function loadIntoEditor(next: ProjectState): void {
    project.files = next.files.map((f) => ({ ...f }));
    project.activeFile = next.activeFile;
    project.stdin = next.stdin;
    editor.loadProject(project.files, project.activeFile);
    project.activeFile = editor.currentPath;
    stdinInput.value = project.stdin;
    renderTabs();
    consoleView.clear();
    scheduleSave();
}

loadIntoEditor(project);

exampleSelect.addEventListener("change", () => {
    const id = exampleSelect.value;
    exampleSelect.value = "";
    if (!id) return;
    const example = EXAMPLES.find((e) => e.id === id);
    if (!example) return;
    loadIntoEditor({
        files: example.files.map((f) => ({ ...f })),
        activeFile: example.entryPath,
        stdin: "",
    });
});

stdinInput.addEventListener("input", () => {
    project.stdin = stdinInput.value;
    scheduleSave();
});

const paneTabs = document.querySelectorAll<HTMLElement>(".pane-tab");
const paneBodies: Record<string, HTMLElement> = {
    output: el("pane-output"),
    stdin: el("pane-stdin"),
};
paneTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        const target = tab.dataset.pane ?? "output";
        paneTabs.forEach((t) => t.classList.toggle("active", t === tab));
        Object.entries(paneBodies).forEach(([key, body]) => body.classList.toggle("active", key === target));
    });
});

// Real-time interactive input (see engine.ts / stdinChannel.ts) answers
// input() inline in the console as the program runs — but since it depends
// on cross-origin isolation actually reaching this worker (not just this
// page), the pre-filled stdin tab stays available at all times as a
// guaranteed fallback rather than being hidden ahead of a run.

function setRunningUI(running: boolean): void {
    runBtn.hidden = running;
    stopBtn.hidden = !running;
    astBtn.disabled = running;
    exampleSelect.disabled = running;
}

initResizeHandle(el("workspace"), el("editor-pane"), el("resize-handle"));

function runProgram(mode: RunMode): void {
    const files = editor.snapshotFiles();
    project.files = files;
    scheduleSave();

    consoleView.clear();
    setRunningUI(true);
    runStatus.textContent = "Running…";

    engine.run(
        { entryPath: editor.currentPath, files, stdin: project.stdin, mode },
        {
            onStdout: (text) => consoleView.stdout(text),
            onStderr: (text) => consoleView.stderr(text),
            onStdinRequest: () => {
                runStatus.textContent = "Waiting for input…";
                consoleView.requestInput((value) => engine.provideStdin(value));
            },
            onStdinUnavailable: () => {
                renderStdinDiagnostic(false);
                consoleView.status(
                    "Live input isn't available here, so the text in the Standard input tab was used instead.",
                );
            },
            onDone: ({ success, error, elapsedMs }) => {
                setRunningUI(false);
                consoleView.cancelInput();
                const time = elapsedMs.toFixed(1);
                if (success) {
                    runStatus.textContent = `Done (${time}ms)`;
                    consoleView.status(`Run finished (${time}ms)`);
                } else {
                    runStatus.textContent = `Error (${time}ms)`;
                    consoleView.stderr(error);
                    consoleView.status(`Run failed (${time}ms)`);
                }
            },
            onFatal: (message) => {
                setRunningUI(false);
                consoleView.cancelInput();
                runStatus.textContent = "Stopped";
                consoleView.status(message);
            },
        },
    );
}

runBtn.addEventListener("click", () => runProgram("run"));
astBtn.addEventListener("click", () => runProgram("ast"));
stopBtn.addEventListener("click", () => {
    engine.stop();
    consoleView.cancelInput();
    setRunningUI(false);
    runStatus.textContent = "Stopped";
    consoleView.status("Run stopped by the user.");
});

window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (!engine.isRunning) runProgram("run");
    }
});

downloadBtn.addEventListener("click", () => {
    const path = editor.currentPath;
    const content = editor.getContent(path);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = path.split("/").pop() ?? "main.cuff";
    a.click();
    URL.revokeObjectURL(url);
});

shareBtn.addEventListener("click", async () => {
    const files = editor.snapshotFiles();
    const url = buildShareUrl({ files, activeFile: editor.currentPath, stdin: project.stdin });
    try {
        await navigator.clipboard.writeText(url);
        shareBtn.innerHTML = `${icons.link}<span>Copied!</span>`;
    } catch {
        window.prompt("Copy this link:", url);
    } finally {
        window.setTimeout(() => {
            shareBtn.innerHTML = `${icons.link}<span>Share link</span>`;
        }, 1500);
    }
});
