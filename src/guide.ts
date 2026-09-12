import "./styles/global.css";
import { initColorScheme, toggleColorScheme } from "./ui/colorScheme";
import { icons } from "./ui/icons";
import { highlightCuffBlocks } from "./editor/staticHighlight";

initColorScheme();
highlightCuffBlocks();

const themeToggle = document.getElementById("theme-toggle") as HTMLButtonElement;
const githubLink = document.getElementById("github-link");
if (githubLink) githubLink.innerHTML = icons.external;

function renderThemeIcon(): void {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    themeToggle.innerHTML = dark ? icons.sun : icons.moon;
}
renderThemeIcon();
themeToggle.addEventListener("click", () => {
    toggleColorScheme();
    renderThemeIcon();
});

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
