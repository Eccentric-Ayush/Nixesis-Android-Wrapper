export type StreakMode = "consecutive-days" | "weekly-count";

export function calculateStreak(
  dates: string[],
  mode: StreakMode,
  target = 1,
  referenceDate = "2026-09-11",
): number {
  const uniqueDates = Array.from(new Set(dates)).sort();
  if (mode === "weekly-count") {
    const weeks = new Map<string, number>();
    uniqueDates.forEach((date) => {
      const day = new Date(`${date}T12:00:00Z`);
      const monday = new Date(day);
      const offset = (day.getUTCDay() + 6) % 7;
      monday.setUTCDate(day.getUTCDate() - offset);
      const key = monday.toISOString().slice(0, 10);
      weeks.set(key, (weeks.get(key) ?? 0) + 1);
    });
    const reference = new Date(`${referenceDate}T12:00:00Z`);
    const referenceMonday = new Date(reference);
    referenceMonday.setUTCDate(reference.getUTCDate() - ((reference.getUTCDay() + 6) % 7));
    let streak = 0;
    for (let cursor = referenceMonday; ; cursor.setUTCDate(cursor.getUTCDate() - 7)) {
      const count = weeks.get(cursor.toISOString().slice(0, 10)) ?? 0;
      if (count < target) break;
      streak += 1;
    }
    return streak;
  }

  const dateSet = new Set(uniqueDates);
  let cursor = new Date(`${referenceDate}T12:00:00Z`);
  if (!dateSet.has(referenceDate)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
