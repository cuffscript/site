export class ConsoleView {
    private lineCount = 0;

    constructor(private container: HTMLElement) {
        this.renderEmpty();
    }

    private renderEmpty(): void {
        this.container.innerHTML = '<div class="console-empty">실행 결과가 여기에 표시됩니다.</div>';
    }

    clear(): void {
        this.lineCount = 0;
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
}
