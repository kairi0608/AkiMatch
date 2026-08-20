import { describe, expect, it } from "vitest";
import { AVAILABILITY_SOURCE, AVAILABILITY_STATUS } from "../../types/availability";
import type { Schedule } from "../../types/schedule";
import { generateTimeSlots } from "../scheduling/time-slots";
import { validateParticipantResponse } from "./response-validation";

const schedule: Schedule = {
  id: "schedule-test",
  title: "回答テスト",
  startDate: "2026-08-20",
  durationDays: 2,
  dailyStartHour: 9,
  dailyEndHour: 11,
  requiredDurationHours: 1,
  createdAt: "2026-08-20T00:00:00.000Z",
};

const availability = generateTimeSlots(schedule).map((slot) => ({
  ...slot,
  status: AVAILABILITY_STATUS.AVAILABLE,
  source: AVAILABILITY_SOURCE.MANUAL,
}));

describe("新規回答と更新回答の共通validation", () => {
  it("期間内の全slotを受け付ける", () => {
    const result = validateParticipantResponse(schedule, { name: " 山田 太郎 ", availability });
    expect(result).toMatchObject({ success: true, data: { name: "山田 太郎" } });
  });

  it("重複slot・期間外・不足slotを拒否する", () => {
    expect(validateParticipantResponse(schedule, { name: "山田", availability: availability.slice(1) }).success).toBe(false);
    expect(validateParticipantResponse(schedule, { name: "山田", availability: [availability[0], availability[0], ...availability.slice(2)] }).success).toBe(false);
    expect(validateParticipantResponse(schedule, { name: "山田", availability: [{ ...availability[0], date: "2026-09-01" }, ...availability.slice(1)] }).success).toBe(false);
  });

  it("不正status・source・長すぎる名前を拒否する", () => {
    expect(validateParticipantResponse(schedule, { name: "あ".repeat(41), availability }).success).toBe(false);
    expect(validateParticipantResponse(schedule, { name: "山田", availability: [{ ...availability[0], status: "UNKNOWN" }, ...availability.slice(1)] }).success).toBe(false);
    expect(validateParticipantResponse(schedule, { name: "山田", availability: [{ ...availability[0], source: "UNKNOWN" }, ...availability.slice(1)] }).success).toBe(false);
  });
});
