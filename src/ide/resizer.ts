const STORAGE_KEY = "cuffscript-ide:editor-width";
const MIN_EDITOR_WIDTH = 320;
const MIN_SIDE_WIDTH = 280;
const MAX_SIDE_WIDTH = 560; // matches .side-pane's CSS max-width

export function initResizeHandle(workspace: HTMLElement, editorPane: HTMLElement, handle: HTMLElement): void {
    function applyWidth(px: number): void {
        editorPane.style.flex = `0 0 ${px}px`;
    }

    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved) && saved > 0) applyWidth(saved);

    function clamp(width: number): number {
        const handleWidth = handle.getBoundingClientRect().width;
        const available = workspace.getBoundingClientRect().width - handleWidth;
        const lowerBound = Math.max(MIN_EDITOR_WIDTH, available - MAX_SIDE_WIDTH);
        const upperBound = Math.max(lowerBound, available - MIN_SIDE_WIDTH);
        return Math.max(lowerBound, Math.min(width, upperBound));
    }

    handle.addEventListener("pointerdown", (event) => {
        handle.setPointerCapture(event.pointerId);
        handle.classList.add("dragging");
    });

    handle.addEventListener("pointermove", (event) => {
        if (!handle.hasPointerCapture(event.pointerId)) return;
        const rect = workspace.getBoundingClientRect();
        applyWidth(clamp(event.clientX - rect.left));
    });

    function stopDragging(event: PointerEvent): void {
        if (!handle.hasPointerCapture(event.pointerId)) return;
        handle.releasePointerCapture(event.pointerId);
        handle.classList.remove("dragging");
        localStorage.setItem(STORAGE_KEY, String(Math.round(editorPane.getBoundingClientRect().width)));
    }
    handle.addEventListener("pointerup", stopDragging);
    handle.addEventListener("pointercancel", stopDragging);

    handle.addEventListener("dblclick", () => {
        editorPane.style.flex = "";
        localStorage.removeItem(STORAGE_KEY);
    });

    const KEY_STEP = 24;
    handle.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const current = editorPane.getBoundingClientRect().width;
        const next = event.key === "ArrowLeft" ? current - KEY_STEP : current + KEY_STEP;
        applyWidth(clamp(next));
        localStorage.setItem(STORAGE_KEY, String(Math.round(editorPane.getBoundingClientRect().width)));
    });
}
