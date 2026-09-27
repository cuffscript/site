import "./styles/base.css";
import { initColorScheme } from "./ui/colorScheme";
import { renderHeader } from "./ui/header";
import { icons } from "./ui/icons";
import { scheduleHighlightCuffBlocks } from "./editor/staticHighlight";
import { renderNewsFeed } from "./newsFeed";

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
};

for (const [id, markup] of Object.entries(iconTargets)) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = markup;
}
