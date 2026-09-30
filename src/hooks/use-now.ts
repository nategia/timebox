import { useEffect, useState } from "react";

const minutesNow = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/** Minutes since local midnight, refreshed at each new minute and when the tab comes back into view. */
export function useNow(): number {
  const [now, setNow] = useState(minutesNow);

  useEffect(() => {
    let timer: number;
    const tick = () => {
      setNow(minutesNow());
      // Wake just after the next minute starts, so the line never lags by most of a minute.
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    tick();
    const onVisible = () => document.visibilityState === "visible" && setNow(minutesNow());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return now;
}
