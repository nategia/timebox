import { create } from "zustand";
import { type StateStorage, createJSONStorage, persist } from "zustand/middleware";
import { SLOT_MINUTES, localDateKey } from "@/domain/time";
import { carryOver, undoCarryOver } from "@/domain/carry-over";
import { type LinkProblem, checkLinkShape } from "@/domain/calendar-link";
import type { Block, Calendar, Day, DayBounds, Days, Task, Theme } from "@/domain/types";
import { type Validation, validateBlock } from "@/domain/validate";

export type { Day };

export type Settings = DayBounds;

export type { Theme };

export type NewTask = Pick<Task, "name" | "minutes" | "kind" | "fixed" | "isBreak">;

/** The last delete, kept briefly so it can be undone. Restores just what was deleted, not the whole day. */
export type UndoEntry =
  | { kind: "task"; label: string; date: string; task: Task; index: number; block?: Block }
  | { kind: "block"; label: string; date: string; block: Block }
  | { kind: "calendar"; label: string; calendar: Calendar; index: number };

type State = {
  today: string;
  days: Days;
  settings: Settings;
  theme: Theme;
  /** Past day being browsed, or null for today. Not persisted: a reload always opens today. */
  viewDate: string | null;
  /** The one-time Safari "add to Dock, export a backup" notice was dismissed. */
  safariNoticeDismissed: boolean;
  calendars: Calendar[];
  /**
   * Today's meetings from calendar links, as fixed blocks. Not persisted and not part of any day:
   * they're re-fetched, so a cancelled meeting disappears and history stays your own plan.
   */
  externalBlocks: Block[];
  /** Not persisted: an undo only makes sense in the moment. */
  undo: UndoEntry | null;
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
  setViewDate: (key: string | null) => void;
  /** Replaces every day, the settings, the theme and (if the backup has them) the calendars. */
  importAll: (data: Omit<Persisted, "calendars"> & { calendars?: Calendar[] }) => void;
  dismissSafariNotice: () => void;
  addCalendar: (name: string, url: string) => { ok: true; id: string } | { ok: false; problem: LinkProblem | "duplicate" };
  removeCalendar: (id: string) => void;
  /** Reverses the last delete (task, block or calendar). */
  undoDelete: () => void;
  clearUndo: () => void;
  setExternalBlocks: (blocks: Block[]) => void;
  /** Removes today's carried tasks and restores them as unfinished on the source day. */
  undoCarryOver: () => void;
  /** Hides the carry-over notice but keeps the tasks. */
  dismissCarryNotice: () => void;
};

const DEFAULT_SETTINGS: Settings = { start: 8 * 60, end: 21 * 60 };

const emptyDay = (): Day => ({ tasks: [], blocks: [], carryOverDone: false });

const newId = () => crypto.randomUUID();

const OK: Validation = { ok: true };

export const PERSIST_VERSION = 3;

export type Persisted = Pick<State, "days" | "settings" | "theme" | "calendars">;

/**
 * Upgrades saved data (and backups) step by step:
 * v1 → v2: `carryOverHandled` renamed to `carryOverDone`; days kept forever.
 * v2 → v3: `calendars` added (empty).
 */
export function migrate(persisted: unknown, version: number): Persisted {
  let state = persisted as Persisted;
  if (version < 2) {
    const days = Object.fromEntries(
      Object.entries(state.days ?? {}).map(([key, day]) => {
        const { carryOverHandled, ...rest } = day as Day & { carryOverHandled?: boolean };
        return [key, { ...rest, carryOverDone: carryOverHandled ?? false }];
      }),
    );
    state = { ...state, days };
  }
  if (version < 3) state = { ...state, calendars: state.calendars ?? [] };
  return state;
}

/** Not persisted: a failed write can't be saved, and saving it would retry the write in a loop. */
export const useStorageStatus = create<{ full: boolean }>(() => ({ full: false }));

export const SNAPSHOT_KEY = "timebox-safety-copy";

/** Cheap proxy for "how much is in here": every task and calendar has a `"name":` field. */
const countNames = (json: string) => json.split('"name":').length - 1;

/**
 * Keeps one safety copy of the previous save, in backup format, taken
 * - before the first save of each local day, and
 * - before any save that would drop 3+ tasks/calendars at once.
 * Best-effort: if storage is tight the copy is skipped, never the real save.
 */
function takeSafetyCopy(previous: string | null, next: string) {
  if (!previous) return;
  try {
    const existing = localStorage.getItem(SNAPSHOT_KEY);
    const takenToday = existing?.includes(`"exportedAt":"${localDateKey(new Date())}`) ?? false;
    const bigDrop = countNames(next) + 3 <= countNames(previous);
    if (takenToday && !bigDrop) return;
    const { state, version } = JSON.parse(previous) as { state: unknown; version: number };
    const now = new Date();
    // exportedAt starts with the local date so "taken today" is a string check, not a parse.
    const stamp = `${localDateKey(now)}T${now.toTimeString().slice(0, 5)}`;
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ app: "timebox", version, exportedAt: stamp, data: state }));
  } catch {
    // Quota or a malformed previous value: skip the copy.
  }
}

/** localStorage that reports a full quota instead of throwing into Zustand, and keeps a safety copy. */
export const guardedStorage = (): StateStorage => {
  // Throwing tells Zustand to skip persistence (e.g. in tests without localStorage).
  if (typeof localStorage === "undefined") throw new Error("localStorage unavailable");
  return {
    getItem: (key) => localStorage.getItem(key),
    removeItem: (key) => localStorage.removeItem(key),
    setItem: (key, value) => {
      takeSafetyCopy(localStorage.getItem(key), value);
      try {
        localStorage.setItem(key, value);
        if (useStorageStatus.getState().full) useStorageStatus.setState({ full: false });
      } catch {
        useStorageStatus.setState({ full: true });
      }
    },
  };
};

export const useDayStore = create<State & Actions>()(
  persist(
    (set, get) => {
      const day = (): Day => get().days[get().today] ?? emptyDay();

      const setDay = (update: (d: Day) => Day) =>
        set((s) => ({ days: { ...s.days, [s.today]: update(s.days[s.today] ?? emptyDay()) } }));

      /** Writes a block only if it validates against the rest of today, meetings from calendars included. */
      const commitBlock = (block: Block, extra?: (d: Day) => Day): Validation => {
        const current = day();
        const result = validateBlock(block, [...current.blocks, ...get().externalBlocks], get().settings);
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
        viewDate: null,
        safariNoticeDismissed: false,
        calendars: [],
        externalBlocks: [],
        undo: null,

        syncToday: (now = new Date()) => {
          const today = localDateKey(now);
          // Auto carry-over runs here: on load, tab focus and midnight rollover. It's a no-op once done for today.
          const { days, today: current } = get();
          const next = carryOver(days, today, newId);
          // Every set() rewrites saved data, so skip it when nothing changed.
          if (today === current && next === days) return;
          set({ today, days: next });
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

        deleteTask: (id) => {
          const current = day();
          const index = current.tasks.findIndex((t) => t.id === id);
          if (index < 0) return;
          const task = current.tasks[index];
          const block = current.blocks.find((b) => b.source === "task" && b.taskId === id);
          setDay((d) => ({
            ...d,
            tasks: d.tasks.filter((t) => t.id !== id),
            blocks: d.blocks.filter((b) => !(b.source === "task" && b.taskId === id)),
          }));
          set({ undo: { kind: "task", label: task.name, date: get().today, task, index, block } });
        },

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

        removeBlock: (id) => {
          const block = day().blocks.find((b) => b.id === id);
          if (!block) return;
          setDay((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));
          const label =
            block.source === "event" ? block.title : (day().tasks.find((t) => t.id === block.taskId)?.name ?? "block");
          set({ undo: { kind: "block", label: `${label} from the timeline`, date: get().today, block } });
        },

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

        importAll: (data) => {
          // Older backups have no calendars: keep the ones already added rather than wiping them.
          set((s) => ({ ...data, calendars: data.calendars ?? s.calendars, viewDate: null }));
          get().syncToday();
        },

        dismissSafariNotice: () => set({ safariNoticeDismissed: true }),

        addCalendar: (name, url) => {
          const problem = checkLinkShape(url);
          if (problem) return { ok: false, problem };
          if (get().calendars.some((c) => c.url.trim() === url.trim())) return { ok: false, problem: "duplicate" };
          const id = newId();
          set((s) => ({ calendars: [...s.calendars, { id, name: name.trim() || "Calendar", url: url.trim() }] }));
          return { ok: true, id };
        },

        removeCalendar: (id) => {
          const index = get().calendars.findIndex((c) => c.id === id);
          if (index < 0) return;
          const calendar = get().calendars[index];
          set((s) => ({
            calendars: s.calendars.filter((c) => c.id !== id),
            undo: { kind: "calendar", label: calendar.name, calendar, index },
          }));
        },

        undoDelete: () => {
          const entry = get().undo;
          set({ undo: null });
          if (!entry) return;
          if (entry.kind === "calendar") {
            set((s) => {
              const calendars = [...s.calendars];
              calendars.splice(Math.min(entry.index, calendars.length), 0, entry.calendar);
              return { calendars };
            });
            return;
          }
          // Deletes only ever happen on today; if midnight passed since, the undo no longer applies.
          if (entry.date !== get().today) return;
          if (entry.kind === "task") {
            setDay((d) => {
              const tasks = [...d.tasks];
              tasks.splice(Math.min(entry.index, tasks.length), 0, entry.task);
              return { ...d, tasks };
            });
            // Put the block back only if its slot is still free; otherwise the task returns unplaced.
            if (entry.block) commitBlock(entry.block);
            return;
          }
          commitBlock(entry.block);
        },

        clearUndo: () => set({ undo: null }),

        setExternalBlocks: (externalBlocks) => set({ externalBlocks }),

        setViewDate: (key) => set((s) => ({ viewDate: key === s.today ? null : key })),

        undoCarryOver: () => set((s) => ({ days: undoCarryOver(s.days, s.today) })),

        dismissCarryNotice: () => setDay((d) => ({ ...d, carriedIn: undefined })),
      };
    },
    {
      name: "timebox",
      version: PERSIST_VERSION,
      migrate,
      storage: createJSONStorage(guardedStorage),
      // Top-level fields merge over defaults, so older saves without `theme` load fine.
      partialize: ({ days, settings, theme, safariNoticeDismissed, calendars }) => ({
        days,
        settings,
        theme,
        safariNoticeDismissed,
        calendars,
      }),
    },
  ),
);

/** Today's day, or a stable empty one. */
const EMPTY_DAY = emptyDay();
export const useToday = () => useDayStore((s) => s.days[s.today] ?? EMPTY_DAY);

/** The day on screen: today, or the past day being browsed. */
export const useViewedDay = () => useDayStore((s) => s.days[s.viewDate ?? s.today] ?? EMPTY_DAY);

/** True while browsing a past day. Every editing action writes to today only, so this is display-only. */
export const useIsPastView = () => useDayStore((s) => s.viewDate !== null && s.viewDate < s.today);
