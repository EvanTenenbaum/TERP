export function findInventoryBrowserSearchInput(
  root: Document | Element | null
): HTMLInputElement | null {
  if (!root) {
    return null;
  }

  const selectors = [
    'input[aria-label="Search inventory"]',
    'input[placeholder="Search inventory..."]',
    'input[type="text"]',
  ];

  for (const selector of selectors) {
    const input = root.querySelector(selector);
    if (input instanceof HTMLInputElement) {
      return input;
    }
  }

  return null;
}

export function queueInventoryBrowserSearchFocus(
  root: HTMLElement | null,
  attempts = 5
) {
  if (!root || typeof window === "undefined") {
    return;
  }

  root.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  const focusSearch = (remainingAttempts: number) => {
    const searchInput = findInventoryBrowserSearchInput(root);
    if (searchInput) {
      searchInput.focus();
      if (document.activeElement === searchInput) {
        return;
      }
    }

    if (remainingAttempts <= 1) {
      return;
    }

    window.setTimeout(() => focusSearch(remainingAttempts - 1), 150);
  };

  window.setTimeout(() => focusSearch(attempts), 150);
}
