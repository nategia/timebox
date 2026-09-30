import { Monitor, Moon, Sun } from "lucide-react";
import { type Theme, useDayStore } from "@/store/day-store";
import { Button } from "./ui/button";

const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Theme, string> = { system: "System", light: "Day", dark: "Night" };
const ICON = { system: Monitor, light: Sun, dark: Moon };

export function ThemeToggle() {
  const theme = useDayStore((s) => s.theme);
  const setTheme = useDayStore((s) => s.setTheme);
  const Icon = ICON[theme];

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={`Theme: ${LABEL[theme]}. Switch to ${LABEL[NEXT[theme]]}`}
      title={`Theme: ${LABEL[theme]}`}
      onClick={() => setTheme(NEXT[theme])}
    >
      <Icon />
      {LABEL[theme]}
    </Button>
  );
}
