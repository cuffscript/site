import "./styles/global.css";
import { initColorScheme } from "./ui/colorScheme";
import { renderHeader } from "./ui/header";
import { scheduleHighlightCuffBlocks } from "./editor/staticHighlight";

initColorScheme();
renderHeader("guide");
scheduleHighlightCuffBlocks();

const sections = Array.from(document.querySelectorAll<HTMLElement>(".guide-section"));
const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".guide-toc a"));
const linkById = new Map(tocLinks.map((link) => [link.getAttribute("href")?.slice(1), link]));

function setActive(id: string | null): void {
    tocLinks.forEach((link) => link.classList.remove("active"));
    if (!id) return;
    linkById.get(id)?.classList.add("active");
}

const observer = new IntersectionObserver(
    (entries) => {
        const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
    },
    { rootMargin: "-72px 0px -70% 0px", threshold: 0 },
);

sections.forEach((section) => observer.observe(section));
if (sections[0]) setActive(sections[0].id);
