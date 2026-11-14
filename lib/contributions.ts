export type ContribDay = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 };

export const CONTRIBUTION_CACHE_KEY = "dexterslab:github:v1";
const CACHE_LIFETIME = 60 * 60 * 1000;

export function readContributionCache(value: unknown, now = Date.now()): ContribDay[] | null {
  if (!value || typeof value !== "object" || !("savedAt" in value) || typeof value.savedAt !== "number"
    || !Number.isFinite(value.savedAt) || now < value.savedAt || now - value.savedAt > CACHE_LIFETIME) return null;
  try { return parseContributions(value); } catch { return null; }
}

/** Validate the third-party response before rendering dates, counts, or CSS classes. */
export function parseContributions(value: unknown): ContribDay[] {
  if (!value || typeof value !== "object" || !("contributions" in value) || !Array.isArray(value.contributions)) {
    throw new Error("Contribution data is unavailable.");
  }
  const dates = new Set<string>();
  const days = value.contributions.map((day: unknown): ContribDay => {
    if (!day || typeof day !== "object" || !("date" in day) || !("count" in day) || !("level" in day)
      || typeof day.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)
      || !Number.isFinite(Date.parse(day.date)) || new Date(day.date).toISOString().slice(0, 10) !== day.date
      || typeof day.count !== "number" || !Number.isSafeInteger(day.count) || day.count < 0
      || typeof day.level !== "number" || !Number.isInteger(day.level) || day.level < 0 || day.level > 4
      || dates.has(day.date)) {
      throw new Error("Contribution data is invalid.");
    }
    dates.add(day.date);
    return { date: day.date, count: day.count, level: day.level as ContribDay["level"] };
  });
  if (!days.length) throw new Error("Contribution data is empty.");
  return days.sort((a, b) => a.date.localeCompare(b.date)).slice(-364);
}

export function contributionWeeks(days: ContribDay[]): (ContribDay | null)[][] {
  if (!days.length) return [];
  const cells: (ContribDay | null)[] = Array(new Date(`${days[0].date}T00:00:00Z`).getUTCDay()).fill(null);
  cells.push(...days);
  const weeks: (ContribDay | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}
