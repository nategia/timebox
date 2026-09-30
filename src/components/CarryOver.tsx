import { X } from "lucide-react";
import { formatDateKey } from "@/domain/time";
import { useDayStore, useToday } from "@/store/day-store";
import { Button } from "./ui/button";

/** "Carried 3 from Tuesday 29 September · Undo", shown after auto carry-over. */
export function CarryOver() {
  const { carriedIn } = useToday();
  const undo = useDayStore((s) => s.undoCarryOver);
  const dismiss = useDayStore((s) => s.dismissCarryNotice);

  if (!carriedIn?.taskIds.length) return null;
  const count = carriedIn.taskIds.length;

  return (
    <section
      role="status"
      aria-label="Carried over"
      className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2 text-sm md:col-span-2"
    >
      <span className="flex-1">
        Carried {count} unfinished {count === 1 ? "task" : "tasks"} from {formatDateKey(carriedIn.from)}.
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={undo}>
        Undo
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Dismiss" onClick={dismiss}>
        <X />
      </Button>
    </section>
  );
}
