import { describe, expect, it } from "vitest";
import { isValidScheduleInput } from "./schedule-validation";

const validInput = {
  title: "プロジェクト打ち合わせ",
  startDate: "2026-08-20",
  durationDays: 30,
  dailyStartHour: 9,
  dailyEndHour: 22,
  requiredDurationHours: 2,
};

describe("日程調整の作成・修正入力", () => {
  it("正しい入力を受け付ける", () => {
    expect(isValidScheduleInput(validInput)).toBe(true);
  });

  it("空のタイトルと長すぎるタイトルを拒否する", () => {
    expect(isValidScheduleInput({ ...validInput, title: "   " })).toBe(false);
    expect(isValidScheduleInput({ ...validInput, title: "あ".repeat(81) })).toBe(false);
  });

  it("矛盾した時刻や範囲外の時刻を拒否する", () => {
    expect(isValidScheduleInput({ ...validInput, dailyStartHour: 22 })).toBe(false);
    expect(isValidScheduleInput({ ...validInput, dailyStartHour: -1 })).toBe(false);
    expect(isValidScheduleInput({ ...validInput, dailyEndHour: 25 })).toBe(false);
  });

  it("対象時間より長い必要時間を拒否する", () => {
    expect(isValidScheduleInput({
      ...validInput,
      dailyStartHour: 9,
      dailyEndHour: 10,
      requiredDurationHours: 2,
    })).toBe(false);
  });
});

