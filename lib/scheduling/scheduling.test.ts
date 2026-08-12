import { describe, expect, it } from "vitest";
import {
  AVAILABILITY_SOURCE,
  AVAILABILITY_STATUS,
  type Availability,
  type AvailabilityStatus,
} from "../../types/availability";
import type { Participant } from "../../types/participant";
import type { Schedule } from "../../types/schedule";
import { selectCandidates } from "./candidate-filter";
import { rankCandidates } from "./scoring";
import { generateTimeSlots } from "./time-slots";

const schedule: Schedule = {
  id: "test",
  title: "テスト",
  startDate: "2026-08-15",
  durationDays: 3,
  dailyStartHour: 9,
  dailyEndHour: 13,
  requiredDurationHours: 1,
  createdAt: "2026-08-01T00:00:00.000Z",
};

const people: Participant[] = ["A", "B", "C"].map((name, index) => ({
  id: name,
  name,
  scheduleId: schedule.id,
  createdAt: `2026-08-01T00:00:0${index}.000Z`,
}));

function answers(
  participantId: string,
  statusFor: (date: string, hour: number) => AvailabilityStatus,
): Availability[] {
  return generateTimeSlots(schedule).map((slot) => ({
    participantId,
    ...slot,
    status: statusFor(slot.date, slot.hour),
    source: AVAILABILITY_SOURCE.MANUAL,
  }));
}

describe("段階的な候補抽出", () => {
  it("1人目が空いている時間だけを次の候補にする", () => {
    const availability = answers("A", (date, hour) =>
      date === "2026-08-16" && hour === 11
        ? AVAILABILITY_STATUS.AVAILABLE
        : AVAILABILITY_STATUS.UNAVAILABLE,
    );
    const result = selectCandidates(schedule, people.slice(0, 1), availability);
    expect(result.mode).toBe("FULL_MATCH");
    expect(result.slots).toEqual([{ date: "2026-08-16", hour: 11 }]);
  });

  it("完全一致が消えると、同率を含む最小衝突候補を復活させる", () => {
    const availability = [
      ...answers("A", (_, hour) =>
        hour === 10
          ? AVAILABILITY_STATUS.AVAILABLE
          : AVAILABILITY_STATUS.UNAVAILABLE,
      ),
      ...answers("B", (_, hour) =>
        hour === 11
          ? AVAILABILITY_STATUS.AVAILABLE
          : AVAILABILITY_STATUS.UNAVAILABLE,
      ),
    ];
    const result = selectCandidates(schedule, people.slice(0, 2), availability);
    expect(result.mode).toBe("MIN_CONFLICT");
    expect(result.minConflict).toBe(1);
    expect(result.slots).toHaveLength(6);
    expect(result.slots.every((slot) => slot.hour === 10 || slot.hour === 11)).toBe(
      true,
    );
  });
});

describe("連続時間とランキング", () => {
  it("2時間会議では、1時間だけ空いた場所を完全一致候補にしない", () => {
    const twoHourSchedule = { ...schedule, requiredDurationHours: 2 };
    const availability = answers("A", (_, hour) =>
      hour === 10
        ? AVAILABILITY_STATUS.AVAILABLE
        : AVAILABILITY_STATUS.UNAVAILABLE,
    );
    const result = selectCandidates(
      twoHourSchedule,
      people.slice(0, 1),
      availability,
    );
    expect(result.mode).toBe("MIN_CONFLICT");
  });

  it("参加不可を参加困難より強く避ける", () => {
    const oneDay = { ...schedule, durationDays: 1 };
    const availability = [
      ...answers("A", (_, hour) =>
        hour === 9
          ? AVAILABILITY_STATUS.UNAVAILABLE
          : hour === 10
            ? AVAILABILITY_STATUS.DIFFICULT
            : AVAILABILITY_STATUS.AVAILABLE,
      ).filter(({ date }) => date === oneDay.startDate),
    ];
    const ranking = rankCandidates(oneDay, people.slice(0, 1), availability);
    expect(ranking.find((item) => item.window.startHour === 9)?.baseScore).toBe(100);
    expect(ranking.find((item) => item.window.startHour === 10)?.baseScore).toBe(10);
  });
});
