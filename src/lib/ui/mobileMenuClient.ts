export function bootMobileMenuDismiss(): void {
  const mobileMenu = globalThis.document.querySelector("[data-mobile-menu]");
  if (!(mobileMenu instanceof globalThis.HTMLDetailsElement)) {
    return;
  }

  globalThis.document.addEventListener("click", (event) => {
    if (!mobileMenu.open) return;

    const target = event.target;
    if (!(target instanceof globalThis.Node)) return;
    if (mobileMenu.contains(target)) return;

    mobileMenu.open = false;
  });

  globalThis.document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!mobileMenu.open) return;

    mobileMenu.open = false;
  });
}
