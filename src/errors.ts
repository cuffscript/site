import "./styles/base.css";
import { initColorScheme } from "./ui/colorScheme";
import { renderHeader } from "./ui/header";
import { initSmoothScroll } from "./ui/smoothScroll";
import { scheduleHighlightCuffBlocks } from "./editor/staticHighlight";
import { buildHaystack, entryMatches, normaliseQuery } from "./errorSearch";

initColorScheme();
initSmoothScroll();
renderHeader("errors");
scheduleHighlightCuffBlocks();

interface Entry {
    el: HTMLElement;
    category: string;
    code: string;
    /** Lower-case text that a search looks through: code, name in words, meaning, cause and fix, the report. */
    haystack: string;
}

const search = document.getElementById("err-search") as HTMLInputElement;
const status = document.getElementById("err-status") as HTMLElement;
const empty = document.getElementById("err-empty") as HTMLElement;
const chips = Array.from(document.querySelectorAll<HTMLButtonElement>(".err-chip"));
const groups = Array.from(document.querySelectorAll<HTMLElement>(".err-group"));
const reservedGroup = document.getElementById("never-raised") as HTMLDetailsElement | null;

const entries: Entry[] = Array.from(document.querySelectorAll<HTMLElement>(".err-entry")).map((el) => {
    const code = el.id;
    const name = el.querySelector(".err-name")?.textContent ?? "";
    const body = Array.from(el.querySelectorAll(".err-meaning, .err-how, .err-example")).map((n) => n.textContent ?? "").join(" ");
    return { el, category: el.dataset.category ?? "", code, haystack: buildHaystack(code, name, body) };
});

let category = "";

function apply(): void {
    const tokens = normaliseQuery(search.value);
    let shown = 0;
    let shownReserved = 0;
    for (const entry of entries) {
        const ok = entryMatches(entry.haystack, entry.category, category, tokens);
        entry.el.hidden = !ok;
        if (ok) {
            shown++;
            if (reservedGroup?.contains(entry.el)) shownReserved++;
        }
    }
    for (const group of groups) group.hidden = !group.querySelector(".err-entry:not([hidden])");
    if (reservedGroup) {
        reservedGroup.hidden = shownReserved === 0;
        // A search that can only be answered by a reserved code opens the group; clearing it closes it again.
        reservedGroup.open = tokens.length > 0 && shownReserved > 0;
    }
    empty.hidden = shown !== 0;
    const total = entries.length;
    status.textContent = tokens.length === 0 && !category ? "" : `${shown} of ${total} errors`;
}

search.addEventListener("input", apply);
search.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && search.value) {
        search.value = "";
        apply();
    }
});
for (const chip of chips) {
    chip.addEventListener("click", () => {
        category = chip.dataset.category ?? "";
        for (const c of chips) c.setAttribute("aria-pressed", String(c === chip));
        apply();
    });
}

/** Opens what hides the entry named by the address (#E4-006) and scrolls to it. */
function showTarget(): void {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (!target || !target.classList.contains("err-entry")) return;
    search.value = "";
    category = "";
    for (const c of chips) c.setAttribute("aria-pressed", String(c.dataset.category === ""));
    apply();
    if (reservedGroup?.contains(target)) reservedGroup.open = true;
    target.scrollIntoView({ block: "start" });
}

window.addEventListener("hashchange", showTarget);
apply();
showTarget();
