import { ArrowDown, ArrowUp, Check, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatDuration, formatTime } from "@/domain/time";
import type { Task } from "@/domain/types";
import { useDayStore, useToday } from "@/store/day-store";
import { cn } from "@/lib/utils";
import { KIND_BG } from "./kind";
import { TaskForm } from "./TaskForm";
import { Button } from "./ui";

type Props = {
  pickedTaskId: string | null;
  onPick: (taskId: string | null) => void;
};

export function TaskList({ pickedTaskId, onPick }: Props) {
  const { tasks, blocks } = useToday();
  const addTask = useDayStore((s) => s.addTask);
  const [editingId, setEditingId] = useState<string | null>(null);

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
        <p className="px-1 text-sm text-muted">
          Nothing here yet. Add what's on your plate today, or paste a list.
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
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
              />
            ),
          )}
        </ol>
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
};

function TaskRow({ task, index, count, start, picked, onPick, onEdit }: RowProps) {
  const updateTask = useDayStore((s) => s.updateTask);
  const deleteTask = useDayStore((s) => s.deleteTask);
  const moveTask = useDayStore((s) => s.moveTask);

  return (
    <li
      className={cn(
        "group flex items-center gap-2 rounded-sm border bg-surface px-2 py-1.5 text-sm",
        picked && "border-accent ring-1 ring-accent",
        task.done && "opacity-50",
      )}
    >
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
      <span className="shrink-0 text-xs text-muted">
        {start !== undefined && `${formatTime(start)} · `}
        {formatDuration(task.minutes)}
        {task.fixed && " · fixed"}
        {task.isBreak && " · break"}
      </span>
      <div className="flex shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <Button aria-label="Higher priority" disabled={index === 0} onClick={() => moveTask(task.id, index - 1)}>
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button aria-label="Lower priority" disabled={index === count - 1} onClick={() => moveTask(task.id, index + 1)}>
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button aria-label="Edit" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button aria-label="Delete" onClick={() => deleteTask(task.id)}>
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
