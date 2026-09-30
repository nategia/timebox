import { type FormEvent, useState } from "react";
import { DURATION_PRESETS, isSlotMultiple } from "@/domain/time";
import { KIND_LABEL, KINDS, type Kind } from "@/domain/types";
import type { NewTask } from "@/store/day-store";
import { cn } from "@/lib/utils";
import { KIND_BG } from "./kind";
import { Button, Input } from "./ui";

type Props = {
  initial?: NewTask;
  submitLabel: string;
  onSubmit: (task: NewTask) => string | void;
  /** Pasting several lines creates one task per line with the chosen settings. */
  onPasteMany?: (names: string[], settings: Omit<NewTask, "name">) => void;
  onCancel?: () => void;
};

const DEFAULT: NewTask = { name: "", minutes: 30, kind: "deep", fixed: false, isBreak: false };

export function TaskForm({ initial = DEFAULT, submitLabel, onSubmit, onPasteMany, onCancel }: Props) {
  const [task, setTask] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<NewTask>) => {
    setError(null);
    setTask((t) => ({ ...t, ...patch }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = task.name.trim();
    if (!name) return;
    if (!isSlotMultiple(task.minutes)) return setError("Use a multiple of 5 minutes");
    const failure = onSubmit({ ...task, name });
    if (failure) return setError(failure);
    if (!onCancel) setTask({ ...task, name: "" });
  };

  const settings = { minutes: task.minutes, kind: task.kind, fixed: task.fixed, isBreak: task.isBreak };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-md border bg-surface p-3">
      <Input
        autoFocus={!!onCancel}
        placeholder="Task name, or paste a list"
        value={task.name}
        aria-label="Task name"
        onChange={(e) => set({ name: e.target.value })}
        onPaste={(e) => {
          const lines = e.clipboardData
            .getData("text")
            .split("\n")
            .map((l) => l.replace(/^\s*([-*•]|\d+[.)])\s*/, "").trim())
            .filter(Boolean);
          if (lines.length < 2 || !onPasteMany) return;
          e.preventDefault();
          onPasteMany(lines, settings);
        }}
      />
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Length">
        {DURATION_PRESETS.map((m) => (
          <Button key={m} variant="chip" active={task.minutes === m} onClick={() => set({ minutes: m })}>
            {m}m
          </Button>
        ))}
        <Input
          type="number"
          min={5}
          step={5}
          aria-label="Custom length in minutes"
          className="w-16 py-0.5"
          value={task.minutes}
          onChange={(e) => set({ minutes: Number(e.target.value) })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Kind">
        {KINDS.map((k: Kind) => (
          <Button key={k} variant="chip" active={task.kind === k} onClick={() => set({ kind: k })}>
            <span className={cn("mr-1 inline-block h-2 w-2 rounded-full", KIND_BG[k])} />
            {KIND_LABEL[k]}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm text-muted">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={task.fixed}
            onChange={(e) => set({ fixed: e.target.checked, isBreak: e.target.checked ? false : task.isBreak })}
          />
          Fixed
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={task.isBreak}
            onChange={(e) =>
              set(e.target.checked ? { isBreak: true, fixed: false, kind: "light" } : { isBreak: false })
            }
          />
          Break
        </label>
        <div className="ml-auto flex gap-1">
          {onCancel && <Button onClick={onCancel}>Cancel</Button>}
          <Button type="submit" variant="primary">
            {submitLabel}
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
