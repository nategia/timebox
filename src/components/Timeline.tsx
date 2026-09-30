import { type DragEvent, type MouseEvent, useRef, useState } from "react";
import { SLOT_MINUTES, formatDuration, formatTime, parseTime } from "@/domain/time";
import { KIND_LABEL, KINDS, type Block, type Kind, type Task } from "@/domain/types";
import { useFlash } from "@/hooks/use-flash";
import { useDayStore, useToday } from "@/store/day-store";
import { cn } from "@/lib/utils";
import { BlockItem } from "./BlockItem";
import { KIND_BG } from "./kind";
import { MeetingForm } from "./MeetingForm";
import { Button, Input } from "./ui";

export const TASK_DRAG_TYPE = "application/x-timebox-task";

type Props = {
  pickedTaskId: string | null;
  onPlaced: () => void;
};

export function Timeline({ pickedTaskId, onPlaced }: Props) {
  const { tasks, blocks } = useToday();
  const { start: dayStart, end: dayEnd } = useDayStore((s) => s.settings);
  const { placeTask, moveBlock, resizeBlock, removeBlock } = useDayStore.getState();
  const { message, flash } = useFlash();
  const grid = useRef<HTMLDivElement>(null);

  const total = dayEnd - dayStart;
  const pxPerMinute = () => (grid.current?.clientHeight ?? total) / total;
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const picked = pickedTaskId ? taskById.get(pickedTaskId) : undefined;
  const planned = blocks.reduce((sum, b) => sum + b.minutes, 0);

  /** Pointer position → start minute, floored to the 5-minute slot under it. */
  const minuteAt = (clientY: number) => {
    const rect = grid.current!.getBoundingClientRect();
    const raw = (clientY - rect.top) / pxPerMinute();
    return dayStart + Math.floor(raw / SLOT_MINUTES) * SLOT_MINUTES;
  };

  const place = (taskId: string, start: number) => {
    const result = placeTask(taskId, start);
    if (!result.ok) return flash(result.reason);
    onPlaced();
  };

  const onGridClick = (e: MouseEvent) => {
    if (picked && e.target === e.currentTarget) place(picked.id, minuteAt(e.clientY));
  };

  const onDrop = (e: DragEvent) => {
    const taskId = e.dataTransfer.getData(TASK_DRAG_TYPE);
    if (!taskId) return;
    e.preventDefault();
    place(taskId, minuteAt(e.clientY));
  };

  const labelOf = (block: Block) =>
    block.source === "event" ? block.title : (taskById.get(block.taskId)?.name ?? "Task");

  const kindOf = (block: Block): Kind | "fixed" =>
    block.source === "event" ? "fixed" : (taskById.get(block.taskId)?.kind ?? "light");

  const hours: number[] = [];
  for (let m = Math.ceil(dayStart / 60) * 60; m < dayEnd; m += 60) hours.push(m);

  return (
    <section className="flex flex-col gap-3" aria-label="Timeline">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        {KINDS.map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-full", KIND_BG[k])} />
            {KIND_LABEL[k]}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className={cn("h-2 w-2 rounded-full", KIND_BG.fixed)} />
          Meeting
        </span>
        <span className="ml-auto text-ink">Planned {formatDuration(planned)}</span>
      </div>

      {/* Pick bar swaps in for the meeting row so the grid never shifts under the cursor. */}
      <div className="flex min-h-10 flex-col justify-center">
        {picked ? (
          <PlacePicked task={picked} dayStart={dayStart} onPlace={(start) => place(picked.id, start)} />
        ) : (
          <MeetingForm onRejected={flash} />
        )}
      </div>

      <p role="status" aria-live="polite" className="min-h-5 text-sm text-danger">
        {message}
      </p>

      <div
        ref={grid}
        className={cn("relative select-none border-t", picked && "cursor-copy")}
        style={{ height: `calc(var(--slot-height) * ${total / SLOT_MINUTES})` }}
        onClick={onGridClick}
        onDragOver={(e) => e.dataTransfer.types.includes(TASK_DRAG_TYPE) && e.preventDefault()}
        onDrop={onDrop}
      >
        {hours.map((m) => (
          <div
            key={m}
            className="pointer-events-none absolute inset-x-0 border-t border-line/70"
            style={{ top: `calc(var(--slot-height) * ${(m - dayStart) / SLOT_MINUTES})` }}
          >
            <span className="absolute -top-2 left-0 bg-bg pr-1 text-xs text-muted">{formatTime(m)}</span>
          </div>
        ))}
        {blocks.map((block) => (
          <BlockItem
            key={block.id}
            block={block}
            label={labelOf(block)}
            kind={kindOf(block)}
            dayStart={dayStart}
            pxPerMinute={pxPerMinute}
            onMove={(start) => moveBlock(block.id, start)}
            onResize={(minutes) => resizeBlock(block.id, minutes)}
            onRemove={() => removeBlock(block.id)}
            onRejected={flash}
          />
        ))}
      </div>
    </section>
  );
}

/** Keyboard path for pick-then-click: type a start time instead of clicking. */
function PlacePicked({ task, dayStart, onPlace }: { task: Task; dayStart: number; onPlace: (start: number) => void }) {
  const [time, setTime] = useState(formatTime(dayStart));
  const start = parseTime(time);
  return (
    <form
      className="flex items-center gap-2 rounded-sm border border-accent bg-accent/10 px-2 py-1.5 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (start !== null) onPlace(start);
      }}
    >
      <span className="min-w-0 flex-1 truncate">
        Click a time to place <strong>{task.name}</strong>, or
      </span>
      <Input aria-label="Start time" className="w-20 py-0.5" value={time} onChange={(e) => setTime(e.target.value)} />
      <Button type="submit" variant="primary" disabled={start === null}>
        Place
      </Button>
    </form>
  );
}
