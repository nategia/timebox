import { create } from "zustand";
import { type StateStorage, createJSONStorage, persist } from "zustand/middleware";
import { SLOT_MINUTES, localDateKey } from "@/domain/time";
import type { Block, DayBounds, Task } from "@/domain/types";
import { type Validation, validateBlock } from "@/domain/validate";

export type Day = {
  tasks: Task[];
  blocks: Block[];
  /** Carry-over already ran (or was undone) for this day, so a reload never carries twice. */
  carryOverDone: boolean;
  /** What auto carry-over added to this day, for the notice and Undo. */
  carriedIn?: { from: string; taskIds: string[] };
};

export type Settings = DayBounds;

/** "system" follows the OS appearance. */
export type Theme = "system" | "light" | "dark";

export type NewTask = Pick<Task, "name" | "minutes" | "kind" | "fixed" | "isBreak">;

type State = {
  today: string;
  days: Record<string, Day>;
  settings: Settings;
  theme: Theme;
};

type Actions = {
  /** Call on load and when the tab becomes visible, so a tab left open overnight rolls over. */
  syncToday: (now?: Date) => void;
  addTask: (task: NewTask) => void;
  updateTask: (id: string, patch: Partial<NewTask & { done: boolean }>) => Validation;
  deleteTask: (id: string) => void;
  moveTask: (id: string, toIndex: number) => void;
  placeTask: (taskId: string, start: number) => Validation;
  addEvent: (title: string, start: number, minutes: number) => Validation;
  moveBlock: (id: string, start: number) => Validation;
  resizeBlock: (id: string, minutes: number) => Validation;
  removeBlock: (id: string) => void;
  setSettings: (settings: Settings) => Validation;
  setTheme: (theme: Theme) => void;
  carryOver: (taskIds: string[]) => void;
};

const DEFAULT_SETTINGS: Settings = { start: 8 * 60, end: 21 * 60 };

const emptyDay = (): Day => ({ tasks: [], blocks: [], carryOverDone: false });

const newId = () => crypto.randomUUID();

const OK: Validation = { ok: true };

const PERSIST_VERSION = 2;

type Persisted = Pick<State, "days" | "settings" | "theme">;

/** v1 → v2: `carryOverHandled` renamed to `carryOverDone`. Days are kept forever from v2 on. */
export function migrate(persisted: unknown, version: number): Persisted {
  const state = persisted as Persisted;
  if (version >= PERSIST_VERSION) return state;
  const days = Object.fromEntries(
    Object.entries(state.days ?? {}).map(([key, day]) => {
      const { carryOverHandled, ...rest } = day as Day & { carryOverHandled?: boolean };
      return [key, { ...rest, carryOverDone: carryOverHandled ?? false }];
    }),
  );
  return { ...state, days };
}

/** Not persisted: a failed write can't be saved, and saving it would retry the write in a loop. */
export const useStorageStatus = create<{ full: boolean }>(() => ({ full: false }));

/** localStorage that reports a full quota instead of throwing into Zustand. */
export const guardedStorage = (): StateStorage => {
  // Throwing tells Zustand to skip persistence (e.g. in tests without localStorage).
  if (typeof localStorage === "undefined") throw new Error("localStorage unavailable");
  return {
    getItem: (key) => localStorage.getItem(key),
    removeItem: (key) => localStorage.removeItem(key),
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, value);
        if (useStorageStatus.getState().full) useStorageStatus.setState({ full: false });
      } catch {
        useStorageStatus.setState({ full: true });
      }
    },
  };
};

/** Most recent earlier day with unfinished tasks, for the carry-over prompt. */
export function previousUnfinished(state: Pick<State, "days" | "today">): { date: string; tasks: Task[] } | null {
  const date = Object.keys(state.days)
    .filter((k) => k < state.today)
    .sort()
    .at(-1);
  if (!date) return null;
  const tasks = state.days[date].tasks.filter((t) => !t.done);
  return tasks.length ? { date, tasks } : null;
}

export const useDayStore = create<State & Actions>()(
  persist(
    (set, get) => {
      const day = (): Day => get().days[get().today] ?? emptyDay();

      const setDay = (update: (d: Day) => Day) =>
        set((s) => ({ days: { ...s.days, [s.today]: update(s.days[s.today] ?? emptyDay()) } }));

      /** Writes a block only if it validates against the rest of today. */
      const commitBlock = (block: Block, extra?: (d: Day) => Day): Validation => {
        const current = day();
        const result = validateBlock(block, current.blocks, get().settings);
        if (!result.ok) return result;
        setDay((d) => {
          const blocks = d.blocks.some((b) => b.id === block.id)
            ? d.blocks.map((b) => (b.id === block.id ? block : b))
            : [...d.blocks, block];
          const next = { ...d, blocks };
          return extra ? extra(next) : next;
        });
        return OK;
      };

      return {
        today: localDateKey(new Date()),
        days: {},
        settings: DEFAULT_SETTINGS,
        theme: "system",

        syncToday: (now = new Date()) => {
          set({ today: localDateKey(now) });
        },

        addTask: (task) =>
          setDay((d) => ({ ...d, tasks: [...d.tasks, { ...task, id: newId(), done: false }] })),

        updateTask: (id, patch) => {
          const block = day().blocks.find((b) => b.source === "task" && b.taskId === id);
          const applyTask = (d: Day) => ({
            ...d,
            tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          });
          if (!block) {
            setDay(applyTask);
            return OK;
          }
          // Keep the placed block in step with the task's length and fixed flag.
          return commitBlock(
            {
              ...block,
              minutes: patch.minutes ?? block.minutes,
              fixed: patch.fixed ?? block.fixed,
            },
            applyTask,
          );
        },

        deleteTask: (id) =>
          setDay((d) => ({
            ...d,
            tasks: d.tasks.filter((t) => t.id !== id),
            blocks: d.blocks.filter((b) => !(b.source === "task" && b.taskId === id)),
          })),

        moveTask: (id, toIndex) =>
          setDay((d) => {
            const from = d.tasks.findIndex((t) => t.id === id);
            if (from < 0) return d;
            const tasks = [...d.tasks];
            const [task] = tasks.splice(from, 1);
            tasks.splice(Math.max(0, Math.min(toIndex, tasks.length)), 0, task);
            return { ...d, tasks };
          }),

        placeTask: (taskId, start) => {
          const current = day();
          const task = current.tasks.find((t) => t.id === taskId);
          if (!task) return { ok: false, reason: "Task not found" };
          const existing = current.blocks.find((b) => b.source === "task" && b.taskId === taskId);
          return commitBlock({
            id: existing?.id ?? newId(),
            source: "task",
            taskId,
            start,
            minutes: task.minutes,
            fixed: task.fixed,
          });
        },

        addEvent: (title, start, minutes) =>
          commitBlock({ id: newId(), source: "event", title, start, minutes, fixed: true }),

        moveBlock: (id, start) => {
          const block = day().blocks.find((b) => b.id === id);
          if (!block) return { ok: false, reason: "Block not found" };
          return commitBlock({ ...block, start });
        },

        resizeBlock: (id, minutes) => {
          const block = day().blocks.find((b) => b.id === id);
          if (!block) return { ok: false, reason: "Block not found" };
          return commitBlock({ ...block, minutes }, (d) =>
            block.source === "task"
              ? {
                  ...d,
                  tasks: d.tasks.map((t) => (t.id === block.taskId ? { ...t, minutes } : t)),
                }
              : d,
          );
        },

        removeBlock: (id) =>
          setDay((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) })),

        setSettings: (settings) => {
          if (settings.start % SLOT_MINUTES !== 0 || settings.end % SLOT_MINUTES !== 0) {
            return { ok: false, reason: "Use 5-minute steps, like 08:00 or 08:05" };
          }
          if (settings.end <= settings.start) {
            return { ok: false, reason: "Day must end after it starts" };
          }
          const outside = day().blocks.some(
            (b) => b.start < settings.start || b.start + b.minutes > settings.end,
          );
          if (outside) return { ok: false, reason: "Some blocks would fall outside the day" };
          set({ settings });
          return OK;
        },

        setTheme: (theme) => set({ theme }),

        carryOver: (taskIds) => {
          const previous = previousUnfinished(get());
          const carried = (previous?.tasks ?? [])
            .filter((t) => taskIds.includes(t.id))
            .map((t) => ({ ...t, id: newId(), done: false }));
          setDay((d) => ({ ...d, tasks: [...d.tasks, ...carried], carryOverDone: true }));
        },
      };
    },
    {
      name: "timebox",
      version: PERSIST_VERSION,
      migrate,
      storage: createJSONStorage(guardedStorage),
      // Top-level fields merge over defaults, so older saves without `theme` load fine.
      partialize: ({ days, settings, theme }) => ({ days, settings, theme }),
    },
  ),
);

/** Today's day, or a stable empty one. */
const EMPTY_DAY = emptyDay();
export const useToday = () => useDayStore((s) => s.days[s.today] ?? EMPTY_DAY);
