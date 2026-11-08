import "./styles/base.css";
import { initColorScheme } from "./ui/colorScheme";
import { renderHeader } from "./ui/header";
import { icons } from "./ui/icons";
import { scheduleHighlightCuffBlocks } from "./editor/staticHighlight";
import { renderNewsFeed } from "./newsFeed";
import { buildShareUrl } from "./ide/state";
import type { CuffEngine } from "./engine/engine";

initColorScheme();
renderHeader("home");
scheduleHighlightCuffBlocks();

const newsList = document.getElementById("news-list");
const newsState = document.getElementById("news-state");
if (newsList && newsState) {
    void renderNewsFeed(newsList, newsState);
}

const iconTargets: Record<string, string> = {
    "icon-play": icons.play,
    "icon-try-play": icons.play,
};

for (const [id, markup] of Object.entries(iconTargets)) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = markup;
}

// "Try it now": the engine is loaded only when someone presses Run.
const tryCode = document.getElementById("try-code") as HTMLTextAreaElement | null;
const tryRun = document.getElementById("try-run");
const tryRunLabel = document.getElementById("try-run-label");
const tryOutput = document.getElementById("try-output");
const tryStatus = document.getElementById("try-status");
const tryIde = document.getElementById("try-ide") as HTMLAnchorElement | null;

if (tryCode && tryRun && tryRunLabel && tryOutput && tryStatus) {
    let engine: CuffEngine | null = null;
    let busy = false;

    const setBusy = (value: boolean) => {
        busy = value;
        tryRunLabel.textContent = value ? "Stop" : "Run";
    };

    const write = (text: string, isError = false) => {
        const span = document.createElement("span");
        if (isError) span.className = "try-error";
        span.textContent = text + "\n";
        tryOutput.append(span);
    };

    const runCode = async () => {
        if (busy) {
            engine?.stop();
            setBusy(false);
            tryStatus.textContent = "Stopped";
            return;
        }
        setBusy(true);
        tryOutput.removeAttribute("data-sample");
        tryOutput.textContent = "";
        tryStatus.textContent = "Running…";
        const { CuffEngine } = await import("./engine/engine");
        engine ??= new CuffEngine();
        const current = engine;
        current.run(
            { entryPath: "main.cuff", files: [{ path: "main.cuff", content: tryCode.value }], stdin: "" },
            {
                onStdout: (text) => write(text),
                onStderr: (text) => write(text, true),
                onStdinRequest: () => current.provideStdin(""),
                onDone: ({ success, error, elapsedMs }) => {
                    setBusy(false);
                    if (!success) write(error, true);
                    tryStatus.textContent = `${success ? "Done" : "Error"} (${elapsedMs.toFixed(1)}ms)`;
                },
                onFatal: (message) => {
                    setBusy(false);
                    tryStatus.textContent = message;
                },
            },
        );
    };

    tryRun.addEventListener("click", () => void runCode());
    tryCode.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            if (!busy) void runCode();
        }
    });

    // The IDE link carries whatever is in the box right now.
    const syncIdeLink = () => {
        if (!tryIde) return;
        const project = { files: [{ path: "main.cuff", content: tryCode.value }], activeFile: "main.cuff", stdin: "" };
        tryIde.href = `/ide/${new URL(buildShareUrl(project)).hash}`;
    };
    tryCode.addEventListener("input", syncIdeLink);
    syncIdeLink();
}
