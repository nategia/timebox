import { useEffect } from "react";
import { useDayStore } from "@/store/day-store";

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

/** Puts `.dark` on <html> from the saved choice, tracking the OS when set to "system". */
export function useTheme() {
  const theme = useDayStore((s) => s.theme);

  useEffect(() => {
    const query = darkQuery();
    const apply = () => {
      const root = document.documentElement;
      const dark = theme === "dark" || (theme === "system" && query.matches);
      // Skip colour transitions for one frame so the switch snaps instead of fading.
      root.classList.add("theme-switching");
      root.classList.toggle("dark", dark);
      requestAnimationFrame(() => root.classList.remove("theme-switching"));
    };
    apply();
    if (theme !== "system") return;
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [theme]);
}
