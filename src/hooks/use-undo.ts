import { useEffect, useState } from "react";
import { useDayStore } from "@/store/day-store";

/** How long the "Deleted … · Undo" bar stays up after the last delete or undo. */
const UNDO_MS = 8000;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * The undo history of deletes. The bar shows for a few seconds after each change to the
 * stack; ⌘Z / Ctrl+Z undoes the latest delete any time you're not typing in a field.
 */
export function useUndo() {
  const stack = useDayStore((s) => s.undoStack);
  const undoDelete = useDayStore((s) => s.undoDelete);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!stack.length) return setVisible(false);
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [stack]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "z" || !(e.metaKey || e.ctrlKey) || e.shiftKey || isTyping(e.target)) return;
      if (!useDayStore.getState().undoStack.length) return;
      e.preventDefault();
      undoDelete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undoDelete]);

  return { latest: visible ? stack.at(-1) : undefined, count: stack.length, undoDelete, hide: () => setVisible(false) };
}
