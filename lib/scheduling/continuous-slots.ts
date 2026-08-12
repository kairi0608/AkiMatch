import type { Schedule, TimeWindow } from "../../types/schedule";
import { generateDates } from "./time-slots";

export function generateContinuousWindows(schedule: Schedule): TimeWindow[] {
  const latestStart = schedule.dailyEndHour - schedule.requiredDurationHours;
  if (latestStart < schedule.dailyStartHour) return [];

  return generateDates(schedule).flatMap((date) =>
    Array.from(
      { length: latestStart - schedule.dailyStartHour + 1 },
      (_, index) => {
        const startHour = schedule.dailyStartHour + index;
        const endHour = startHour + schedule.requiredDurationHours;
        return {
          date,
          startHour,
          endHour,
          slots: Array.from(
            { length: schedule.requiredDurationHours },
            (__, slotIndex) => ({ date, hour: startHour + slotIndex }),
          ),
        };
      },
    ),
  );
}
