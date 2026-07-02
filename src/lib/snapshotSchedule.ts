function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Whether a new daily snapshot is due, given the last snapshot's date key (YYYY-MM-DD) or null. */
export function shouldSnapshotToday(lastSnapshotDateKey: string | null, now: Date): boolean {
  return lastSnapshotDateKey !== toDateKey(now);
}

export function todayKey(now: Date): string {
  return toDateKey(now);
}
