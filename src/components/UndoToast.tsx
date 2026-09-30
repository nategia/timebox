import { X } from "lucide-react";
import { useUndo } from "@/hooks/use-undo";
import { Button } from "./ui/button";

/** "Deleted 'Gym' · Undo (3)", bottom centre. Each Undo steps back one delete. */
export function UndoToast() {
  const { latest, count, undoDelete, hide } = useUndo();
  if (!latest) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg border bg-popover py-2 pl-4 pr-2 text-sm text-popover-foreground shadow-lg"
    >
      <span className="min-w-0 truncate">
        Deleted <span className="font-medium">{latest.label}</span>
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={undoDelete} title="Undo (⌘Z)">
        Undo{count > 1 && ` (${count})`}
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Dismiss" onClick={hide}>
        <X />
      </Button>
    </div>
  );
}
