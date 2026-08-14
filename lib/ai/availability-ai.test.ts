import { describe, expect, it } from "vitest";
import { AVAILABILITY_SOURCE, AVAILABILITY_STATUS } from "../../types/availability";
import type { Schedule } from "../../types/schedule";
import { applyAvailabilityRules } from "../scheduling/availability-rules";
import { generateTimeSlots, slotKey } from "../scheduling/time-slots";
import {
  aiAvailabilityOutputSchema,
  normalizeAIAvailabilityResponse,
} from "./schemas";
import { AVAILABILITY_SYSTEM_PROMPT } from "./prompts";
import { isAIConfigured } from "./server-config";

const schedule: Schedule = {
  id: "ai-test",
  title: "AI入力テスト",
  startDate: "2026-08-15",
  durationDays: 30,
  dailyStartHour: 9,
  dailyEndHour: 22,
  requiredDurationHours: 1,
  createdAt: "2026-08-01T00:00:00.000Z",
};

const baseRule = {
  id: "rule-1",
  weekdays: [] as number[],
  startDate: null as string | null,
  endDate: null as string | null,
  startHour: 9,
  endHour: 22,
  status: AVAILABILITY_STATUS.UNAVAILABLE as "AVAILABLE" | "DIFFICULT" | "UNAVAILABLE",
  confidence: "HIGH" as "HIGH" | "MEDIUM" | "LOW",
  reason: "明確な予定",
};

function normalize(availabilityRules: Array<typeof baseRule & { type: "WEEKDAY" | "DATE" | "DATE_RANGE" }>, preferences: Array<{ type: "TIME_OF_DAY" | "WEEKDAY" | "GENERAL"; value: string; weight: number; reason: string }> = []) {
  const parsed = aiAvailabilityOutputSchema.parse({
    availabilityRules,
    preferences,
    summary: "予定を整理しました。",
  });
  return normalizeAIAvailabilityResponse(parsed, schedule);
}

describe("AI予定の構造化と安全な展開", () => {
  it("『水曜日は絶対無理』相当のルールを水曜UNAVAILABLEとして展開する", () => {
    const plan = normalize([{ ...baseRule, type: "WEEKDAY", weekdays: [3] }]);
    const result = applyAvailabilityRules(
      { statuses: {}, sources: {} },
      generateTimeSlots(schedule),
      plan.availabilityRules,
      { source: AVAILABILITY_SOURCE.AI, preserveManual: true },
    );
    expect(result.changedKeys.length).toBeGreaterThan(0);
    expect(result.changedKeys.every((key) => result.state.statuses[key] === AVAILABILITY_STATUS.UNAVAILABLE)).toBe(true);
  });

  it("曖昧な火曜夕方バイトはDIFFICULTの構造を維持する", () => {
    const plan = normalize([{
      ...baseRule,
      type: "WEEKDAY",
      weekdays: [2],
      startHour: 17,
      endHour: 21,
      status: AVAILABILITY_STATUS.DIFFICULT,
      confidence: "MEDIUM",
      reason: "夕方を17時〜21時として解釈",
    }]);
    expect(plan.availabilityRules[0].status).toBe(AVAILABILITY_STATUS.DIFFICULT);
  });

  it("『できれば午後がいい』相当はAvailabilityを潰さずPreferenceだけになる", () => {
    const plan = normalize([], [{
      type: "TIME_OF_DAY",
      value: "午後",
      weight: 3,
      reason: "できれば午後がいい",
    }]);
    expect(plan.availabilityRules).toHaveLength(0);
    expect(plan.preferences[0].value).toBe("午後");
  });

  it("20〜23日の旅行を対象月の日付範囲として維持する", () => {
    const plan = normalize([{
      ...baseRule,
      type: "DATE_RANGE",
      startDate: "2026-08-20",
      endDate: "2026-08-23",
    }]);
    expect(plan.availabilityRules[0]).toMatchObject({
      type: "DATE_RANGE",
      startDate: "2026-08-20",
      endDate: "2026-08-23",
      status: AVAILABILITY_STATUS.UNAVAILABLE,
    });
  });

  it("MANUALはAIルールより優先される", () => {
    const manualKey = "2026-08-19:10";
    const plan = normalize([{ ...baseRule, type: "WEEKDAY", weekdays: [3] }]);
    const result = applyAvailabilityRules(
      {
        statuses: { [manualKey]: AVAILABILITY_STATUS.AVAILABLE },
        sources: { [manualKey]: AVAILABILITY_SOURCE.MANUAL },
      },
      generateTimeSlots(schedule),
      plan.availabilityRules,
      { source: AVAILABILITY_SOURCE.AI, preserveManual: true },
    );
    expect(result.state.statuses[manualKey]).toBe(AVAILABILITY_STATUS.AVAILABLE);
    expect(result.skippedManualKeys).toContain(manualKey);
  });

  it("プレビュー生成は元stateを変更せず、承認後stateとUndo用snapshotを分離できる", () => {
    const original = { statuses: {}, sources: {} };
    const snapshot = structuredClone(original);
    const plan = normalize([{ ...baseRule, type: "DATE", startDate: "2026-08-21" }]);
    const preview = applyAvailabilityRules(original, generateTimeSlots(schedule), plan.availabilityRules, {
      source: AVAILABILITY_SOURCE.AI,
      preserveManual: true,
    });
    expect(original).toEqual(snapshot);
    expect(preview.changedKeys.length).toBeGreaterThan(0);
    expect(snapshot).toEqual({ statuses: {}, sources: {} });
  });

  it("期間外日付を除外し、対象外時刻を安全に切り詰める", () => {
    const plan = normalize([
      { ...baseRule, id: "outside", type: "DATE", startDate: "2026-10-01" },
      { ...baseRule, id: "clamped", type: "DATE", startDate: "2026-08-21", startHour: 0, endHour: 24 },
    ]);
    expect(plan.availabilityRules).toHaveLength(1);
    expect(plan.availabilityRules[0]).toMatchObject({ startHour: 9, endHour: 22 });
  });
});

describe("AI設定とプロンプト", () => {
  it("APIキー未設定を検出し、通常入力と独立させる", () => {
    expect(isAIConfigured("")).toBe(false);
    expect(isAIConfigured("test-key")).toBe(true);
  });

  it("曖昧表現とPreference分離をSystem Promptへ明示する", () => {
    expect(AVAILABILITY_SYSTEM_PROMPT).toContain("安易にUNAVAILABLEにしない");
    expect(AVAILABILITY_SYSTEM_PROMPT).toContain("Preferenceへ入れ");
  });
});
