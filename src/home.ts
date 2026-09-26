import "./styles/base.css";
import { initColorScheme } from "./ui/colorScheme";
import { renderHeader } from "./ui/header";
import { icons } from "./ui/icons";
import { scheduleHighlightCuffBlocks } from "./editor/staticHighlight";

initColorScheme();
renderHeader("home");
scheduleHighlightCuffBlocks();

const iconTargets: Record<string, string> = {
    "icon-play": icons.play,
    "icon-ext-1": icons.external,
    "icon-ext-2": icons.external,
};

for (const [id, markup] of Object.entries(iconTargets)) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = markup;
}
