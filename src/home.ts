import "./styles/base.css";
import { initColorScheme } from "./ui/colorScheme";
import { renderHeader } from "./ui/header";
import { icons } from "./ui/icons";
import { scheduleHighlightCuffBlocks } from "./editor/staticHighlight";

initColorScheme();
renderHeader("home");
scheduleHighlightCuffBlocks();

const iconTargets: Record<string, string> = {
    "icon-game": icons.game,
    "icon-feather": icons.feather,
    "icon-flash": icons.flash,
};

for (const [id, markup] of Object.entries(iconTargets)) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = markup;
}
