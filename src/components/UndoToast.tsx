import { X } from "lucide-react";
import { useUndo } from "@/hooks/use-undo";
import { Button } from "./ui/button";

/** "Deleted 'Write proposal' · Undo", bottom centre, like Gmail. */
export function UndoToast() {
  const { entry, undoDelete, clearUndo } = useUndo();
  if (!entry) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg border bg-popover py-2 pl-4 pr-2 text-sm text-popover-foreground shadow-lg"
    >
      <span className="min-w-0 truncate">
        Deleted <span className="font-medium">{entry.label}</span>
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={undoDelete}>
        Undo
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Dismiss" onClick={clearUndo}>
        <X />
      </Button>
    </div>
  );
}
