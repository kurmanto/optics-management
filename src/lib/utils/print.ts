"use client";

/**
 * Print abstraction layer.
 * Currently uses browser window.print().
 * Future: direct hardware printer via print server.
 */

/**
 * Trigger print of the current page.
 */
export function triggerPrint(): void {
  if (typeof window === "undefined") return;
  window.print();
}

/**
 * Open a URL in a new tab and trigger print after it loads.
 */
export function openAndPrint(url: string): void {
  if (typeof window === "undefined") return;
  const tab = window.open(url, "_blank");
  if (!tab) {
    console.warn("Popup blocked — please allow popups for this site.");
    return;
  }
  tab.addEventListener("load", () => {
    setTimeout(() => tab.print(), 500);
  });
}
