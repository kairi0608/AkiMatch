import { describe, expect, it } from "vitest";
import { AVAILABILITY_STATUS } from "../../types/availability";
import type { TimeSlot } from "../../types/schedule";
import {
  applyAvailabilityRule,
  copyDayToSameWeekday,
  slotsMatchingRule,
} from "./availability-rules";
import { groupDatesByMonth } from "./calendar";
import { slotKey } from "./time-slots";

const slots: TimeSlot[] = [
  { date: "2026-08-14", hour: 9 },
  { date: "2026-08-14", hour: 10 },
  { date: "2026-08-15", hour: 9 },
  { date: "2026-08-17", hour: 9 },
  { date: "2026-08-17", hour: 10 },
  { date: "2026-08-24", hour: 9 },
  { date: "2026-08-24", hour: 10 },
];

describe("availability rules", () => {
  it("平日ルールは土日を除いて指定時間だけに適用する", () => {
    const matched = slotsMatchingRule(slots, {
      type: "WEEKDAY",
      weekdays: [1, 2, 3, 4, 5],
      startHour: 9,
      endHour: 10,
      status: AVAILABILITY_STATUS.UNAVAILABLE,
    });
    expect(matched.map(slotKey)).toEqual([
      "2026-08-14:9",
      "2026-08-17:9",
      "2026-08-24:9",
    ]);
  });

  it("日付範囲は両端を含む", () => {
    const next = applyAvailabilityRule({}, slots, {
      type: "DATE_RANGE",
      startDate: "2026-08-14",
      endDate: "2026-08-15",
      startHour: 9,
      endHour: 11,
      status: AVAILABILITY_STATUS.DIFFICULT,
    });
    expect(Object.keys(next)).toHaveLength(3);
    expect(next["2026-08-15:9"]).toBe(AVAILABILITY_STATUS.DIFFICULT);
  });

  it("同じ曜日へ日別設定をコピーする", () => {
    const current = {
      "2026-08-17:9": AVAILABILITY_STATUS.UNAVAILABLE,
      "2026-08-17:10": AVAILABILITY_STATUS.DIFFICULT,
    };
    const next = copyDayToSameWeekday(current, slots, "2026-08-17");
    expect(next["2026-08-24:9"]).toBe(AVAILABILITY_STATUS.UNAVAILABLE);
    expect(next["2026-08-24:10"]).toBe(AVAILABILITY_STATUS.DIFFICULT);
  });
});

describe("calendar grouping", () => {
  it("年をまたぐ期間も月ごとに分割する", () => {
    const months = groupDatesByMonth([
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
    expect(months.map((month) => month.key)).toEqual(["2026-12", "2027-01"]);
    expect(months[1].dates).toEqual(["2027-01-01", "2027-01-02"]);
  });
});
