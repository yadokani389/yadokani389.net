export function bootCardLinkNavigation(): void {
  globalThis.document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof globalThis.Element)) return;
    if (target.closest("a, button, input, textarea, select")) return;

    const card = target.closest("[data-card-link]");
    if (!card) return;

    const href = card.getAttribute("data-href");
    if (href) {
      globalThis.window.location.href = href;
    }
  });

  globalThis.document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const active = globalThis.document.activeElement;
    if (!(active instanceof globalThis.Element)) return;
    if (active.closest("a, button, input, textarea, select")) return;

    const card = active.closest("[data-card-link]");
    if (!card) return;

    const href = card.getAttribute("data-href");
    if (href) {
      event.preventDefault();
      globalThis.window.location.href = href;
    }
  });
}
