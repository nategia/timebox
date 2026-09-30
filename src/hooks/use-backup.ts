import { useCallback } from "react";
import { type BackupData, type ParsedBackup, parseBackup, serializeBackup } from "@/domain/backup";
import { localDateKey } from "@/domain/time";
import { PERSIST_VERSION, migrate, useDayStore } from "@/store/day-store";

/** Backups are a few hundred KB even after years; anything much bigger isn't ours. */
const MAX_BYTES = 10 * 1024 * 1024;

/** Export to a file download, and read/apply a backup file. Everything stays in the browser. */
export function useBackup() {
  const importAll = useDayStore((s) => s.importAll);

  const exportBackup = useCallback(() => {
    const { days, settings, theme } = useDayStore.getState();
    const text = serializeBackup({ days, settings, theme }, PERSIST_VERSION, new Date());
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `timebox-backup-${localDateKey(new Date())}.json`;
    link.click();
    // Revoking in the same tick can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const readBackup = useCallback(async (file: File): Promise<ParsedBackup> => {
    if (file.size > MAX_BYTES) return { ok: false, reason: "That file is too big to be a Timebox backup." };
    return parseBackup(await file.text(), PERSIST_VERSION, migrate);
  }, []);

  const applyBackup = useCallback((data: BackupData) => importAll(data), [importAll]);

  return { exportBackup, readBackup, applyBackup };
}
