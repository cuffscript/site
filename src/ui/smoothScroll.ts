import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * Smooth wheel scrolling for pages that scroll the window (home, guide).
 * Not used by the IDE, whose panels scroll on their own.
 * Lenis itself turns smoothing off for people who prefer reduced motion.
 */
export function initSmoothScroll(): void {
    new Lenis({
        autoRaf: true,
        lerp: 0.12,
        anchors: true,
        allowNestedScroll: true,
    });
}
