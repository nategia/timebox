import { X } from "lucide-react";
import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";
import { SLOT_MINUTES, formatDuration, formatTime, snap } from "@/domain/time";
import type { Block, Kind } from "@/domain/types";
import type { Validation } from "@/domain/validate";
import { cn } from "@/lib/utils";
import { KIND_BLOCK } from "./kind";

type Props = {
  block: Block;
  label: string;
  kind: Kind | "fixed";
  dayStart: number;
  /** Measured from the timeline, so slot height stays a token. */
  pxPerMinute: () => number;
  /** Past days: no drag, resize, keyboard edits or remove. */
  readOnly?: boolean;
  onMove: (start: number) => Validation;
  onResize: (minutes: number) => Validation;
  onRemove: () => void;
  onRejected: (reason: string) => void;
};

type Drag = { mode: "move" | "resize"; originY: number };

const slots = (minutes: number) => `calc(var(--slot-height) * ${minutes / SLOT_MINUTES})`;

export function BlockItem({
  block,
  label,
  kind,
  dayStart,
  pxPerMinute,
  readOnly = false,
  onMove,
  onResize,
  onRemove,
  onRejected,
}: Props) {
  const draggable = block.source === "task" && !readOnly;
  const drag = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<{ start: number; minutes: number } | null>(null);
  const shown = preview ?? block;

  const commit = (result: Validation) => {
    if (!result.ok) onRejected(result.reason);
  };

  const begin = (mode: Drag["mode"]) => (e: PointerEvent) => {
    if (!draggable || e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, originY: e.clientY };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag.current) return;
    const delta = snap((e.clientY - drag.current.originY) / pxPerMinute());
    setPreview(
      drag.current.mode === "move"
        ? { start: block.start + delta, minutes: block.minutes }
        : { start: block.start, minutes: Math.max(SLOT_MINUTES, block.minutes + delta) },
    );
  };

  // Commit on release; an invalid result snaps back because the preview is cleared.
  const onPointerUp = () => {
    const mode = drag.current?.mode;
    drag.current = null;
    if (preview && mode === "move" && preview.start !== block.start) commit(onMove(preview.start));
    if (preview && mode === "resize" && preview.minutes !== block.minutes) commit(onResize(preview.minutes));
    setPreview(null);
  };

  // Keyboard: ↑/↓ moves 5 min, Shift+↑/↓ resizes, Delete removes.
  const onKeyDown = (e: KeyboardEvent) => {
    if (readOnly) return;
    if (e.key === "Delete" || e.key === "Backspace") return onRemove();
    if (!draggable || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    const step = e.key === "ArrowUp" ? -SLOT_MINUTES : SLOT_MINUTES;
    commit(e.shiftKey ? onResize(block.minutes + step) : onMove(block.start + step));
  };

  const compact = shown.minutes < 20;

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${label}, ${formatTime(shown.start)} to ${formatTime(shown.start + shown.minutes)}`}
      title={label}
      className={cn(
        "group absolute left-12 right-1 overflow-hidden rounded-sm border-l-2 px-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
        KIND_BLOCK[kind],
        draggable ? "cursor-grab touch-none" : "cursor-default",
        preview && "z-10 cursor-grabbing opacity-80 shadow",
      )}
      style={{ top: slots(shown.start - dayStart), height: slots(shown.minutes) }}
      onPointerDown={begin("move")}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current = null;
        setPreview(null);
      }}
      onKeyDown={onKeyDown}
    >
      <div className={cn("flex gap-2", compact ? "items-center leading-none" : "pt-0.5")}>
        <span className="truncate font-medium">{label}</span>
        <span className="shrink-0 text-muted-foreground">
          {formatTime(shown.start)}–{formatTime(shown.start + shown.minutes)}
          {!compact && ` · ${formatDuration(shown.minutes)}`}
        </span>
{!readOnly && (
        <button
          type="button"
          aria-label={`Remove ${label} from timeline`}
          className="ml-auto shrink-0 text-muted-foreground opacity-0 hover:text-foreground focus:opacity-100 group-hover:opacity-100"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </button>
        )}
      </div>
      {/* Short blocks would be all handle; they resize with Shift+↑/↓ instead. */}
      {draggable && shown.minutes > 2 * SLOT_MINUTES && (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
          onPointerDown={begin("resize")}
        />
      )}
    </div>
  );
}
