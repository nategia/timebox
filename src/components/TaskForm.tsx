import { type FormEvent, useState } from "react";
import { DURATION_PRESETS, isSlotMultiple } from "@/domain/time";
import { KIND_LABEL, KINDS, type Kind } from "@/domain/types";
import type { NewTask } from "@/store/day-store";
import { cn } from "@/lib/utils";
import { KIND_BG } from "./kind";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";

type Props = {
  initial?: NewTask;
  submitLabel: string;
  onSubmit: (task: NewTask) => string | void;
  /** Pasting several lines creates one task per line with the chosen settings. */
  onPasteMany?: (names: string[], settings: Omit<NewTask, "name">) => void;
  onCancel?: () => void;
};

/** Selected preset chip. */
const chip = (active: boolean) => cn("h-7 px-2 font-normal", active && "border-primary bg-primary/10");

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
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-md border bg-card p-3">
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
          <Button key={m} type="button" variant="outline" size="sm" className={chip(task.minutes === m)} onClick={() => set({ minutes: m })}>
            {m}m
          </Button>
        ))}
        <Input
          type="number"
          min={5}
          step={5}
          aria-label="Custom length in minutes"
          className="w-16 h-8"
          value={task.minutes || ""}
          onChange={(e) => set({ minutes: e.target.valueAsNumber || 0 })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Kind">
        {KINDS.map((k: Kind) => (
          <Button key={k} type="button" variant="outline" size="sm" className={chip(task.kind === k)} onClick={() => set({ kind: k })}>
            <span className={cn("mr-1 inline-block h-2 w-2 rounded-full", KIND_BG[k])} />
            {KIND_LABEL[k]}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <label className="flex items-center gap-1">
          <Checkbox
            checked={task.fixed}
            onCheckedChange={(v) => set({ fixed: v === true, isBreak: v === true ? false : task.isBreak })}
          />
          Fixed
        </label>
        <label className="flex items-center gap-1">
          <Checkbox
            checked={task.isBreak}
            onCheckedChange={(v) =>
              set(v === true ? { isBreak: true, fixed: false, kind: "light" } : { isBreak: false })
            }
          />
          Break
        </label>
        <div className="ml-auto flex gap-1">
          {onCancel && <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" size="sm">
            {submitLabel}
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
