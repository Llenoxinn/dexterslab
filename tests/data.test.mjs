import assert from "node:assert/strict";
import { test } from "node:test";
import { parseContributions, contributionWeeks, readContributionCache } from "../lib/contributions.ts";
import { DEFAULT_PREFS, parsePrefs } from "../lib/preferences.ts";
import { formatDuration } from "../lib/content.ts";

test("preferences reject malformed storage and preserve valid options", () => {
  for (const value of [null, false, 42, [], "phosphor", { theme: "invalid", rails: "false", density: null, fx: "invalid" }]) {
    assert.deepEqual(parsePrefs(value), DEFAULT_PREFS);
  }
  assert.deepEqual(parsePrefs({ theme: "phosphor", rails: false, density: "compact", fx: "calm" }),
    { theme: "phosphor", rails: false, density: "compact", fx: "calm" });
});

const day = (date, count = 2, level = 1) => ({ date, count, level });

test("GitHub cache accepts recent validated data and rejects stale or corrupt entries", () => {
  const cached = { savedAt: 1000, contributions: [day("2026-11-14")] };
  assert.deepEqual(readContributionCache(cached, 1500), cached.contributions);
  assert.equal(readContributionCache(cached, 1000 + 3600001), null);
  assert.equal(readContributionCache(cached, 999), null);
  assert.equal(readContributionCache({ ...cached, contributions: [day("invalid")] }, 1500), null);
  assert.equal(readContributionCache({ savedAt: Infinity }, 1500), null);
  assert.equal(readContributionCache(null), null);
});

test("GitHub cache goes stale at midnight in Manila, however young it is", () => {
  const beforeMidnight = Date.parse("2026-11-14T15:50:00Z"); // 23:50 in Manila
  const cached = { savedAt: beforeMidnight, contributions: [day("2026-11-14")] };
  assert.deepEqual(readContributionCache(cached, beforeMidnight + 5 * 60 * 1000), cached.contributions); // 23:55
  assert.equal(readContributionCache(cached, beforeMidnight + 10 * 60 * 1000), null); // 00:00, new day
});

test("contributions sort real dates and keep the last 364 days", () => {
  const contributions = Array.from({ length: 370 }, (_, index) => {
    const date = new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10);
    return day(date, index);
  }).reverse();
  const result = parseContributions({ contributions, total: { lastYear: 999999 } });
  assert.equal(result.length, 364);
  assert.equal(result[0].date, "2025-01-07");
  assert.equal(result.at(-1).count, 369);
});

test("untrusted contributions cannot fabricate counts, dates, or CSS levels", () => {
  for (const contributions of [[], [null], [day("2026-02-30")], [day("2026-11-14", -1)],
    [day("2026-11-14", 1.5)], [day("2026-11-14", 1, 8)], [day("2026-11-14", "3")],
    [day("2026-11-14"), day("2026-11-14")], [day("invalid")]]) {
    assert.throws(() => parseContributions({ contributions }));
  }
  for (const response of [undefined, null, {}, { contributions: "invalid" }]) {
    assert.throws(() => parseContributions(response));
  }
});

test("contribution weeks align Sunday through Saturday in UTC", () => {
  const weeks = contributionWeeks([day("2026-11-09"), day("2026-11-10")]);
  assert.equal(weeks[0][0], null);
  assert.equal(weeks[0][1].date, "2026-11-09");
  assert.deepEqual(contributionWeeks([]), []);
  assert.equal(contributionWeeks([day("2026-11-08")])[0][0].date, "2026-11-08");
});

test("experience durations keep inclusive months at year boundaries", () => {
  assert.equal(formatDuration("2025-12", "2026-01"), "2 mos");
  assert.equal(formatDuration("2025-01", "2025-12"), "1 yr");
  assert.equal(formatDuration("2025-01", "present", new Date(2026, 0, 15)), "1 yr 1 mo");
});
