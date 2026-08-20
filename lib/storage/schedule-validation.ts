import type { Schedule } from "@/types/schedule";

export type ScheduleInput = Omit<Schedule, "id" | "createdAt">;

export function isValidScheduleInput(value: unknown): value is ScheduleInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.title === "string" &&
    item.title.trim().length > 0 &&
    item.title.trim().length <= 80 &&
    typeof item.startDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.startDate) &&
    Number.isInteger(item.durationDays) &&
    Number(item.durationDays) >= 1 &&
    Number(item.durationDays) <= 60 &&
    Number.isInteger(item.dailyStartHour) &&
    Number.isInteger(item.dailyEndHour) &&
    Number(item.dailyStartHour) >= 0 &&
    Number(item.dailyStartHour) <= 23 &&
    Number(item.dailyEndHour) >= 1 &&
    Number(item.dailyEndHour) <= 24 &&
    Number(item.dailyEndHour) > Number(item.dailyStartHour) &&
    Number.isInteger(item.requiredDurationHours) &&
    Number(item.requiredDurationHours) >= 1 &&
    Number(item.requiredDurationHours) <= 8 &&
    Number(item.requiredDurationHours) <=
      Number(item.dailyEndHour) - Number(item.dailyStartHour)
  );
}

