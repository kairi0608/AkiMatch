import { addDays, format, parseISO } from "date-fns";
import type { Schedule, TimeSlot } from "../../types/schedule";

export const slotKey = (slot: TimeSlot) => `${slot.date}:${slot.hour}`;

export function generateDates(schedule: Schedule): string[] {
  const start = parseISO(schedule.startDate);
  return Array.from({ length: schedule.durationDays }, (_, index) =>
    format(addDays(start, index), "yyyy-MM-dd"),
  );
}

export function generateHours(schedule: Schedule): number[] {
  return Array.from(
    { length: schedule.dailyEndHour - schedule.dailyStartHour },
    (_, index) => schedule.dailyStartHour + index,
  );
}

export function generateTimeSlots(schedule: Schedule): TimeSlot[] {
  return generateDates(schedule).flatMap((date) =>
    generateHours(schedule).map((hour) => ({ date, hour })),
  );
}
