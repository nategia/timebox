import { useEffect } from "react";
import { useDayStore } from "@/store/day-store";

/** Re-checks the date on load and on tab focus, so a tab left open overnight starts a new day. */
export function useDayRollover() {
  const syncToday = useDayStore((s) => s.syncToday);

  useEffect(() => {
    syncToday();
    const onVisible = () => document.visibilityState === "visible" && syncToday();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [syncToday]);
}
