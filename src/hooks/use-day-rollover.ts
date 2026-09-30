import { useEffect } from "react";
import { useDayStore } from "@/store/day-store";

const STORAGE_KEY = "timebox";

/**
 * Keeps this tab in step with saved data and the calendar date.
 * - On focus: reload what's saved first (another tab may have written), then roll the date over.
 *   Without the reload, a tab left open overnight would save its stale copy over everything.
 * - When another tab saves: reload, so this tab never edits an old copy.
 */
export function useDayRollover() {
  const syncToday = useDayStore((s) => s.syncToday);

  useEffect(() => {
    const refresh = async () => {
      await useDayStore.persist.rehydrate();
      syncToday();
    };
    void refresh();

    const onVisible = () => document.visibilityState === "visible" && void refresh();
    const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && void useDayStore.persist.rehydrate();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [syncToday]);
}
