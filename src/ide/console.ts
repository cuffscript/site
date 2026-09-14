export class ConsoleView {
    private lineCount = 0;
    private pendingInput: HTMLInputElement | null = null;

    constructor(private container: HTMLElement) {
        this.renderEmpty();
    }

    private renderEmpty(): void {
        this.container.innerHTML = '<div class="console-empty">실행 결과가 여기에 표시됩니다.</div>';
    }

    clear(): void {
        this.lineCount = 0;
        this.pendingInput = null;
        this.renderEmpty();
    }

    private appendLine(text: string, className?: string): void {
        if (this.lineCount === 0) this.container.innerHTML = "";
        const line = document.createElement("div");
        if (className) line.className = className;
        line.textContent = text.length > 0 ? text : "\u00A0";
        this.container.appendChild(line);
        this.lineCount += 1;
        this.container.scrollTop = this.container.scrollHeight;
    }

    stdout(text: string): void {
        this.appendLine(text);
    }

    stderr(text: string): void {
        this.appendLine(text, "console-line-stderr");
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
