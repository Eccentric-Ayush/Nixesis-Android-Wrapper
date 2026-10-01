import { describe, expect, it } from "vitest";
import { calculateStreak } from "../client/src/lib/streak";

describe("calculateStreak", () => {
  it("counts a current consecutive reading streak", () => {
    expect(calculateStreak(["2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11"], "consecutive-days", 1, "2026-09-11")).toBe(4);
  });

  it("stops when a consecutive day is missing", () => {
    expect(calculateStreak(["2026-09-06", "2026-09-08", "2026-09-09"], "consecutive-days", 1, "2026-09-09")).toBe(2);
  });

  it("counts consecutive weeks that meet a weekly target", () => {
    expect(calculateStreak([
      "2026-08-24", "2026-08-26", "2026-08-28",
      "2026-08-31", "2026-09-02", "2026-09-04", "2026-09-06",
      "2026-09-07", "2026-09-09", "2026-09-10", "2026-09-11",
    ], "weekly-count", 3, "2026-09-11")).toBe(3);
  });
});
