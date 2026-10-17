export function bootDetailsDismiss(): void {
  const menus =
    globalThis.document.querySelectorAll<globalThis.HTMLDetailsElement>(
      'details[name="site-controls"]',
    );

  globalThis.document.addEventListener("click", (event) => {
    if (!(event.target instanceof globalThis.Node)) return;
    for (const menu of menus) {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    }
  });

  globalThis.document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    for (const menu of menus) {
      if (!menu.open) continue;
      menu.open = false;
      menu.querySelector("summary")?.focus();
    }
  });
}
