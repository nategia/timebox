import { Download, History, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { BackupData } from "@/domain/backup";
import { useBackup } from "@/hooks/use-backup";
import { useDayStore } from "@/store/day-store";
import type { Days } from "@/domain/types";
import { useStorage } from "@/hooks/use-storage";
import { Button } from "./ui/button";

type Pending = { data: BackupData; dayCount: number; exportedAt: string; source: "file" | "safety" };

const countTasks = (days: Days) => Object.values(days).reduce((n, d) => n + d.tasks.length, 0);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Export / import of every saved day. Import always asks before replacing. */
export function DataPanel() {
  const { exportBackup, readBackup, applyBackup, readSafetyCopy } = useBackup();
  const { showSafariNotice, dismissSafariNotice } = useStorage();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [note, setNote] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setNote(null);
    const result = await readBackup(file);
    if (!result.ok) return setNote({ tone: "error", text: result.reason });
    setPending({ ...result, source: "file" });
  };

  const onRestoreSafetyCopy = () => {
    setNote(null);
    const result = readSafetyCopy();
    if (!result) return setNote({ tone: "error", text: "There's no safety copy yet. One is taken automatically as you use the app." });
    if (!result.ok) return setNote({ tone: "error", text: result.reason });
    const { days, calendars } = useDayStore.getState();
    const same =
      JSON.stringify(result.data.days) === JSON.stringify(days) &&
      JSON.stringify(result.data.calendars ?? []) === JSON.stringify(calendars);
    if (same) return setNote({ tone: "ok", text: "The safety copy is the same as what you have now, so there's nothing to restore." });
    setPending({ ...result, source: "safety" });
  };

  const currentTasks = countTasks(useDayStore.getState().days);

  const exportedOn = pending?.exportedAt
    ? new Date(pending.exportedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : "an unknown date";

  return (
    <section aria-label="Your data" className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-sm md:col-span-2">
      {showSafariNotice && (
        <div role="note" className="flex flex-wrap items-center gap-2 rounded-md border border-ring/50 bg-ring/10 p-3">
          <p className="mr-auto">
            Safari can delete this app's data after about a week without a visit. To keep your history, add Timebox to
            your Dock (File → Add to Dock) or Home Screen (Share → Add to Home Screen), and export a backup now and then.
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={dismissSafariNotice}>
            Got it
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-muted-foreground">
          Your days are saved in this browser only. Export a backup now and then to keep them safe. Backups include
          your calendar links, so keep the file private.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={exportBackup}>
          <Download /> Export backup
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
          <Upload /> Import backup
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onRestoreSafetyCopy}>
          <History /> Restore safety copy
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            // Reset so choosing the same file again still fires onChange.
            e.target.value = "";
          }}
        />
      </div>

      {pending && (
        <div role="alertdialog" aria-label="Confirm import" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
          <p className="mr-auto">
            {pending.source === "safety" ? `Safety copy from ${exportedOn}` : `Backup exported ${exportedOn}`}:{" "}
            <strong>{plural(countTasks(pending.data.days), "task")}</strong> across {plural(pending.dayCount, "day")}
            {pending.data.calendars?.length ? `, ${plural(pending.data.calendars.length, "calendar link")}` : ""}. You have{" "}
            <strong>{plural(currentTasks, "task")}</strong> now. Restoring replaces everything with the {pending.source === "safety" ? "copy" : "backup"}.
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setPending(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              applyBackup(pending.data);
              setPending(null);
              setNote({ tone: "ok", text: "Backup restored." });
            }}
          >
            Replace all
          </Button>
        </div>
      )}

      {note && (
        <p role="status" className={note.tone === "error" ? "text-destructive" : "text-muted-foreground"}>
          {note.text}
        </p>
      )}
    </section>
  );
}
