import { ArrowDown, ArrowUp, Check, GripVertical, Pencil, Trash2 } from "lucide-react";
import { type DragEvent, useState } from "react";
import { dropIndex } from "@/domain/order";
import { formatDuration, formatTime } from "@/domain/time";
import type { Task } from "@/domain/types";
import { useDayStore, useToday } from "@/store/day-store";
import { cn } from "@/lib/utils";
import { KIND_BG } from "./kind";
import { TaskForm } from "./TaskForm";
import { TASK_DRAG_TYPE } from "./Timeline";
import { Button } from "./ui/button";

type Props = {
  pickedTaskId: string | null;
  onPick: (taskId: string | null) => void;
};

export function TaskList({ pickedTaskId, onPick }: Props) {
  const { tasks, blocks } = useToday();
  const addTask = useDayStore((s) => s.addTask);
  const moveTask = useDayStore((s) => s.moveTask);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Gap the dragged task would drop into: 0 = above the first row. */
  const [dropGap, setDropGap] = useState<number | null>(null);

  const onRowDragOver = (e: DragEvent, index: number) => {
    if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE)) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setDropGap(e.clientY < rect.top + rect.height / 2 ? index : index + 1);
  };

  const onListDrop = (e: DragEvent) => {
    const taskId = e.dataTransfer.getData(TASK_DRAG_TYPE);
    const from = tasks.findIndex((t) => t.id === taskId);
    if (from < 0 || dropGap === null) return setDropGap(null);
    e.preventDefault();
    moveTask(taskId, dropIndex(from, dropGap));
    setDropGap(null);
  };

  const startOf = (task: Task) =>
    blocks.find((b) => b.source === "task" && b.taskId === task.id)?.start;

  return (
    <section className="flex flex-col gap-3" aria-label="Tasks">
      <TaskForm
        submitLabel="Add"
        onSubmit={addTask}
        onPasteMany={(names, settings) => names.forEach((name) => addTask({ ...settings, name }))}
      />
      {tasks.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          Nothing here yet. Add what's on your plate today, or paste a list.
        </p>
      ) : (
        <>
        <p className="flex items-baseline justify-between px-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Priority</span>
          <span>Top is most important · drag to reorder</span>
        </p>
        <ol
          className="flex flex-col gap-1"
          onDrop={onListDrop}
          onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDropGap(null)}
        >
          {tasks.map((task, index) =>
            editingId === task.id ? (
              <li key={task.id}>
                <EditTask task={task} onDone={() => setEditingId(null)} />
              </li>
            ) : (
              <TaskRow
                key={task.id}
                task={task}
                index={index}
                count={tasks.length}
                start={startOf(task)}
                picked={pickedTaskId === task.id}
                onPick={() => onPick(pickedTaskId === task.id ? null : task.id)}
                onEdit={() => setEditingId(task.id)}
                onDragOver={(e) => onRowDragOver(e, index)}
                onDragEnd={() => setDropGap(null)}
                dropEdge={dropGap === index ? "top" : dropGap === index + 1 ? "bottom" : null}
              />
            ),
          )}
        </ol>
        </>
      )}
    </section>
  );
}

type RowProps = {
  task: Task;
  index: number;
  count: number;
  start: number | undefined;
  picked: boolean;
  onPick: () => void;
  onEdit: () => void;
  onDragOver: (e: DragEvent) => void;
  onDragEnd: () => void;
  /** Shows where a dragged task would land. */
  dropEdge: "top" | "bottom" | null;
};

/** #1 is filled, #2–3 outlined, the rest quiet: the top of the list should read as "do this first". */
const RANK_STYLE = (index: number) =>
  index === 0
    ? "bg-primary text-primary-foreground"
    : index < 3
      ? "border border-foreground/30 text-foreground"
      : "text-muted-foreground";

function TaskRow({ task, index, count, start, picked, onPick, onEdit, onDragOver, onDragEnd, dropEdge }: RowProps) {
  const updateTask = useDayStore((s) => s.updateTask);
  const deleteTask = useDayStore((s) => s.deleteTask);
  const moveTask = useDayStore((s) => s.moveTask);

  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(TASK_DRAG_TYPE, task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-center gap-2 rounded-md border bg-card py-2 pl-1 pr-3 text-sm",
        picked && "border-ring ring-1 ring-ring",
        task.done && "opacity-50",
        dropEdge === "top" && "shadow-[inset_0_2px_0_0_rgb(var(--ring))]",
        dropEdge === "bottom" && "shadow-[inset_0_-2px_0_0_rgb(var(--ring))]",
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/60" aria-hidden />
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium tabular-nums",
          RANK_STYLE(index),
        )}
        aria-label={`Priority ${index + 1}`}
      >
        {index + 1}
      </span>
      <button
        type="button"
        aria-label={task.done ? `Mark ${task.name} not done` : `Mark ${task.name} done`}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
        onClick={() => updateTask(task.id, { done: !task.done })}
      >
        {task.done && <Check className="h-3 w-3" />}
      </button>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", KIND_BG[task.kind])} aria-hidden />
      <button
        type="button"
        className={cn("min-w-0 flex-1 truncate text-left", task.done && "line-through")}
        title="Pick, then click a time on the timeline"
        aria-pressed={picked}
        onClick={onPick}
      >
        {task.name}
      </button>
      <span className="shrink-0 text-xs text-muted-foreground">
        {start !== undefined && `${formatTime(start)} · `}
        {formatDuration(task.minutes)}
        {task.fixed && " · fixed"}
        {task.isBreak && " · break"}
      </span>
      <div className="flex shrink-0 opacity-30 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Higher priority" disabled={index === 0} onClick={() => moveTask(task.id, index - 1)}>
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Lower priority" disabled={index === count - 1} onClick={() => moveTask(task.id, index + 1)}>
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Delete" onClick={() => deleteTask(task.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

function EditTask({ task, onDone }: { task: Task; onDone: () => void }) {
  const updateTask = useDayStore((s) => s.updateTask);
  return (
    <TaskForm
      initial={{ name: task.name, minutes: task.minutes, kind: task.kind, fixed: task.fixed, isBreak: task.isBreak }}
      submitLabel="Save"
      onCancel={onDone}
      onSubmit={(patch) => {
        const result = updateTask(task.id, patch);
        if (!result.ok) return result.reason;
        onDone();
      }}
    />
  );
}
