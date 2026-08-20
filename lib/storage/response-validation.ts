import { addDays, isValid, isWithinInterval, parseISO } from "date-fns";
import {
  AVAILABILITY_SOURCE,
  AVAILABILITY_STATUS,
  type Availability,
} from "../../types/availability";
import type { Schedule } from "../../types/schedule";

const statuses = new Set(Object.values(AVAILABILITY_STATUS));
const sources = new Set(Object.values(AVAILABILITY_SOURCE));

export type ParticipantResponseInput = {
  name?: unknown;
  availability?: unknown;
};

export type ValidParticipantResponse = {
  name: string;
  availability: Omit<Availability, "participantId">[];
};

export type ParticipantResponseValidation =
  | { success: true; data: ValidParticipantResponse }
  | { success: false; error: string };

export function validateParticipantResponse(
  schedule: Schedule,
  input: ParticipantResponseInput | null,
): ParticipantResponseValidation {
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 40 || !Array.isArray(input?.availability)) {
    return { success: false, error: "回答内容を確認してください。" };
  }

  const availability = input.availability as Array<Record<string, unknown>>;
  const expectedCount = schedule.durationDays * (schedule.dailyEndHour - schedule.dailyStartHour);
  if (availability.length !== expectedCount || availability.length > 1500) {
    return { success: false, error: "期間内のすべての時間へ回答してください。" };
  }

  const start = parseISO(schedule.startDate);
  const end = addDays(start, schedule.durationDays - 1);
  const unique = new Set<string>();
  const normalized: Omit<Availability, "participantId">[] = [];
  for (const item of availability) {
    const date = typeof item.date === "string" ? item.date : "";
    const hour = item.hour;
    const parsedDate = parseISO(date);
    const key = `${date}:${hour}`;
    if (
      unique.has(key) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !isValid(parsedDate) ||
      !isWithinInterval(parsedDate, { start, end }) ||
      !Number.isInteger(hour) ||
      Number(hour) < schedule.dailyStartHour ||
      Number(hour) >= schedule.dailyEndHour ||
      !statuses.has(item.status as Availability["status"]) ||
      !sources.has(item.source as Availability["source"])
    ) {
      return { success: false, error: "回答範囲に不正な時間が含まれています。" };
    }
    unique.add(key);
    normalized.push({
      date,
      hour: Number(hour),
      status: item.status as Availability["status"],
      source: item.source as Availability["source"],
    });
  }

  return { success: true, data: { name, availability: normalized } };
}
