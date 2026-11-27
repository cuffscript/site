export class ConsoleView {
    private lineCount = 0;
    private pendingInput: HTMLInputElement | null = null;

    constructor(private container: HTMLElement) {
        this.renderEmpty();
    }

    private renderEmpty(): void {
        this.container.innerHTML = '<div class="console-empty">Output will appear here.</div>';
    }

    clear(): void {
        this.lineCount = 0;
        this.pendingInput = null;
        this.renderEmpty();
    }

    private appendLine(text: string, className?: string, linkErrorCode = false): void {
        if (this.lineCount === 0) this.container.innerHTML = "";
        const line = document.createElement("div");
        if (className) line.className = className;
        const tag = linkErrorCode ? /\[E(\d{1,2})-(\d{3})\]/.exec(text) : null;
        if (tag) {
            // "ERROR: [E4-006] Runtime Error ..." -> the code becomes a link to its page in the error reference.
            // The href is rebuilt from the parsed numbers, never from the program's output text,
            // so nothing the running program prints can reach the link target.
            const category = Number(tag[1]);
            const number = Number(tag[2]);
            const code = `E${category}-${String(number).padStart(3, "0")}`;
            const link = document.createElement("a");
            link.className = "console-error-link";
            link.href = `/errors/#${code}`;
            link.target = "_blank";
            link.rel = "noreferrer";
            link.title = "What does this error mean?";
            link.textContent = `[${code}]`;
            line.append(text.slice(0, tag.index), link, text.slice(tag.index + tag[0].length));
        } else {
            line.textContent = text.length > 0 ? text : "\u00A0";
        }
        this.container.appendChild(line);
        this.lineCount += 1;
        this.container.scrollTop = this.container.scrollHeight;
    }

    stdout(text: string): void {
        this.appendLine(text);
    }

    stderr(text: string): void {
        this.appendLine(text, "console-line-stderr", true);
    }

    status(text: string): void {
        this.appendLine(text, "console-line-status");
    }

    // Shows a focused inline input line at the bottom of the console; calls
    // onSubmit with whatever was typed once the person presses Enter.
    requestInput(onSubmit: (value: string) => void): void {
        if (this.lineCount === 0) this.container.innerHTML = "";

        const row = document.createElement("div");
        row.className = "console-input-row";

        const prompt = document.createElement("span");
        prompt.className = "console-input-prompt";
        prompt.textContent = "❯";

        const field = document.createElement("input");
        field.type = "text";
        field.className = "console-input-field";
        field.autocomplete = "off";
        field.spellcheck = false;

        row.appendChild(prompt);
        row.appendChild(field);
        this.container.appendChild(row);
        this.lineCount += 1;
        this.pendingInput = field;
        this.container.scrollTop = this.container.scrollHeight;
        field.focus();

        field.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            const value = field.value;
            row.remove();
            this.pendingInput = null;
            this.appendLine(value, "console-line-input-echo");
            onSubmit(value);
        });
    }

    // Removes a pending inline input row, e.g. when the run is stopped.
    cancelInput(): void {
        this.pendingInput?.closest(".console-input-row")?.remove();
        this.pendingInput = null;
    }
}
