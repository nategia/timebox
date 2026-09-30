import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateKey, formatShortDateKey, shiftDateKey } from "@/domain/time";
import { useDayStore } from "@/store/day-store";
import { Button } from "./ui/button";

/** ‹ date › in the header. Stops at today: no future days (spec: no multi-day planning). */
export function DayNav() {
  const today = useDayStore((s) => s.today);
  const viewDate = useDayStore((s) => s.viewDate);
  const setViewDate = useDayStore((s) => s.setViewDate);
  const current = viewDate ?? today;
  const onToday = current >= today;

  return (
    <nav className="flex items-center gap-1" aria-label="Day">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-6 sm:w-7"
        aria-label="Previous day"
        onClick={() => setViewDate(shiftDateKey(current, -1))}
      >
        <ChevronLeft />
      </Button>
      <span className="min-w-0 truncate text-muted-foreground" aria-live="polite">
        <span className="sm:hidden">{formatShortDateKey(current)}</span>
        <span className="hidden sm:inline">{formatDateKey(current)}</span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-6 sm:w-7"
        aria-label="Next day"
        disabled={onToday}
        onClick={() => setViewDate(shiftDateKey(current, 1))}
      >
        <ChevronRight />
      </Button>
      {!onToday && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setViewDate(null)}>
          Today
        </Button>
      )}
    </nav>
  );
}
