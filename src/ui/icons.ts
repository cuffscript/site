const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const icons = {
  play: svg('<path d="M6 4l14 8-14 8V4z" fill="currentColor" stroke="none"/>'),
  stop: svg('<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>'),
  sun: svg(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
  ),
  moon: svg('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>'),
  link: svg(
    '<path d="M9 15l6-6"/><path d="M11 6l1-1a4 4 0 0 1 5.5 5.5l-1.5 1.5"/><path d="M13 18l-1 1A4 4 0 0 1 6.5 13.5L8 12"/>',
  ),
  download: svg('<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M5 21h14"/>'),
  plus: svg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  close: svg('<path d="M6 6l12 12"/><path d="M18 6L6 18"/>'),
  external: svg('<path d="M7 17L17 7"/><path d="M9 7h8v8"/>'),
  tree: svg('<path d="M4 5h4M4 12h7M4 19h10"/><circle cx="19" cy="5" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="19" r="1.6" fill="currentColor" stroke="none"/>'),
  game: svg('<rect x="3" y="8" width="18" height="10" rx="5"/><path d="M8 11v4M6 13h4"/><circle cx="16" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="18" cy="14" r="1" fill="currentColor" stroke="none"/>'),
  feather: svg('<path d="M20 4c-6 0-14 4-16 16 12-2 16-10 16-16z"/><path d="M4 20l6-6"/><path d="M8 16l2.5-1M11 13l2.5-1M14 10l2.5-1"/>'),
  flash: svg('<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="currentColor" stroke="none"/>'),
};
