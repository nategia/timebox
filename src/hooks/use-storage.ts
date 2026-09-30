import { useEffect } from "react";
import { useDayStore } from "@/store/day-store";

/**
 * Safari the browser, not Chrome/Firefox/Edge on iOS or macOS (they all say "Safari" in the UA).
 * Only Safari deletes script-writable storage after ~7 days without a visit.
 */
export function isSafari(userAgent: string): boolean {
  return /Safari\//.test(userAgent) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\/|OPR\/|Android/.test(userAgent);
}

/** Running from the Dock or Home Screen, where Safari's 7-day deletion doesn't apply. */
function isInstalled(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

/** Asks the browser once to keep our data, and reports whether to show the Safari notice. */
export function useStorage(): { showSafariNotice: boolean; dismissSafariNotice: () => void } {
  const dismissed = useDayStore((s) => s.safariNoticeDismissed);
  const setDismissed = useDayStore((s) => s.dismissSafariNotice);

  useEffect(() => {
    const storage = navigator.storage;
    if (!storage?.persist) return;
    // Chrome may grant silently for sites you use often; a refusal just means best-effort storage.
    void storage.persisted().then((already) => already || storage.persist());
  }, []);

  return {
    showSafariNotice: !dismissed && isSafari(navigator.userAgent) && !isInstalled(),
    dismissSafariNotice: setDismissed,
  };
}
