import { icons } from "../ui/icons";

export interface TabBarCallbacks {
    onSelect: (path: string) => void;
    onAdd: () => void;
    onClose: (path: string) => void;
}

export class TabBar {
    constructor(
        private container: HTMLElement,
        private callbacks: TabBarCallbacks,
    ) { }

    render(paths: string[], activePath: string): void {
        this.container.innerHTML = "";

        for (const path of paths) {
            const tab = document.createElement("div");
            tab.className = "tab" + (path === activePath ? " active" : "");
            tab.tabIndex = 0;

            const label = document.createElement("span");
            label.textContent = path;
            tab.appendChild(label);

            if (paths.length > 1) {
                const close = document.createElement("span");
                close.className = "tab-close";
                close.innerHTML = icons.close;
                close.title = "파일 삭제";
                close.addEventListener("click", (event) => {
                    event.stopPropagation();
                    this.callbacks.onClose(path);
                });
                tab.appendChild(close);
            }

            tab.addEventListener("click", () => this.callbacks.onSelect(path));
            this.container.appendChild(tab);
        }

        const addBtn = document.createElement("div");
        addBtn.className = "tab-add";
        addBtn.innerHTML = icons.plus;
        addBtn.title = "파일 추가";
        addBtn.addEventListener("click", () => this.callbacks.onAdd());
        this.container.appendChild(addBtn);
    }
}
