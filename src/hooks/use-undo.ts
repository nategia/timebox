import { useEffect } from "react";
import { useDayStore } from "@/store/day-store";

/** How long "Deleted … · Undo" stays up. */
const UNDO_MS = 8000;

/** The last delete and its undo, cleared after a few seconds so an old undo can't surprise anyone. */
export function useUndo() {
  const entry = useDayStore((s) => s.undo);
  const undoDelete = useDayStore((s) => s.undoDelete);
  const clearUndo = useDayStore((s) => s.clearUndo);

  useEffect(() => {
    if (!entry) return;
    const timer = window.setTimeout(clearUndo, UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [entry, clearUndo]);

  return { entry, undoDelete, clearUndo };
}
