import "./styles/global.css";
import { initColorScheme } from "./ui/colorScheme";
import { renderHeader } from "./ui/header";
import { icons } from "./ui/icons";
import { scheduleHighlightCuffBlocks } from "./editor/staticHighlight";

initColorScheme();
renderHeader("home");
scheduleHighlightCuffBlocks();

const iconTargets: Record<string, string> = {
    "icon-book": icons.book,
    "icon-wand": icons.wand,
    "icon-shield": icons.shield,
    "icon-globe": icons.globe,
};

for (const [id, markup] of Object.entries(iconTargets)) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = markup;
}
