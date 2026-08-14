import { addDays, format, isAfter, isBefore, isValid, parseISO } from "date-fns";
import { z } from "zod";
import type { AIAvailabilityResponse, AvailabilityRule } from "./types";
import type { Schedule } from "../../types/schedule";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const aiAvailabilityRequestSchema = z.object({
  schedule: z.object({
    startDate: z.string().regex(datePattern),
    durationDays: z.number().int().min(1).max(60),
    dailyStartHour: z.number().int().min(0).max(23),
    dailyEndHour: z.number().int().min(1).max(24),
  }).strict(),
  text: z.string().trim().min(1).max(1600),
  profile: z.object({
    lifePattern: z.enum(["STUDENT", "EMPLOYEE", "SHIFT", "OTHER"]),
    weekdayBusyness: z.enum(["EASY", "NORMAL", "BUSY"]),
    weekendBusyness: z.enum(["EASY", "NORMAL", "BUSY"]),
    preferredTime: z.enum(["MORNING", "AFTERNOON", "EVENING", "NONE"]),
  }).strict(),
}).strict().refine(
  ({ schedule }) => schedule.dailyEndHour > schedule.dailyStartHour,
  "終了時刻は開始時刻より後にしてください。",
);

export const aiAvailabilityOutputSchema = z.object({
  availabilityRules: z.array(z.object({
    id: z.string().min(1).max(80),
    type: z.enum(["WEEKDAY", "DATE", "DATE_RANGE"]),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    startHour: z.number().int().min(0).max(24),
    endHour: z.number().int().min(0).max(24),
    status: z.enum(["AVAILABLE", "DIFFICULT", "UNAVAILABLE"]),
    confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
    reason: z.string().max(240),
  }).strict()).max(40),
  preferences: z.array(z.object({
    type: z.enum(["TIME_OF_DAY", "WEEKDAY", "GENERAL"]),
    value: z.string().min(1).max(120),
    weight: z.number().int().min(1).max(5),
    reason: z.string().max(240),
  }).strict()).max(20),
  summary: z.string().min(1).max(600),
}).strict();

const normalizedRuleBase = z.object({
  id: z.string().max(80).optional(),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
  status: z.enum(["AVAILABLE", "DIFFICULT", "UNAVAILABLE"]),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  reason: z.string().max(240).optional(),
});

export const aiAvailabilityResponseSchema = z.object({
  availabilityRules: z.array(z.discriminatedUnion("type", [
    normalizedRuleBase.extend({
      type: z.literal("WEEKDAY"),
      weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    }),
    normalizedRuleBase.extend({
      type: z.literal("DATE"),
      date: z.string().regex(datePattern),
    }),
    normalizedRuleBase.extend({
      type: z.literal("DATE_RANGE"),
      startDate: z.string().regex(datePattern),
      endDate: z.string().regex(datePattern),
    }),
  ])).max(40),
  preferences: z.array(z.object({
    type: z.enum(["TIME_OF_DAY", "WEEKDAY", "GENERAL"]),
    value: z.string().min(1).max(120),
    weight: z.number().int().min(1).max(5).optional(),
    reason: z.string().max(240).optional(),
  }).strict()).max(20),
  summary: z.string().min(1).max(600),
}).strict();

export type RawAIAvailabilityResponse = z.infer<typeof aiAvailabilityOutputSchema>;

function validDate(value: string | null): value is string {
  return Boolean(value && datePattern.test(value) && isValid(parseISO(value)));
}

/** AI出力を調整期間・時間帯へ制限し、利用できないルールを除外する。 */
export function normalizeAIAvailabilityResponse(
  raw: RawAIAvailabilityResponse,
  schedule: Pick<Schedule, "startDate" | "durationDays" | "dailyStartHour" | "dailyEndHour">,
): AIAvailabilityResponse {
  const periodStart = parseISO(schedule.startDate);
  const periodEnd = addDays(periodStart, schedule.durationDays - 1);
  const inPeriod = (date: string) => {
    const parsed = parseISO(date);
    return isValid(parsed) && !isBefore(parsed, periodStart) && !isAfter(parsed, periodEnd);
  };

  const availabilityRules = raw.availabilityRules.flatMap<AvailabilityRule>((rule) => {
    const startHour = Math.max(schedule.dailyStartHour, rule.startHour);
    const endHour = Math.min(schedule.dailyEndHour, rule.endHour);
    if (startHour >= endHour) return [];

    const common = {
      id: rule.id,
      startHour,
      endHour,
      status: rule.status,
      confidence: rule.confidence,
      reason: rule.reason,
    } as const;

    if (rule.type === "WEEKDAY") {
      const weekdays = [...new Set(rule.weekdays)].filter((day) => day >= 0 && day <= 6);
      return weekdays.length ? [{ ...common, type: "WEEKDAY", weekdays }] : [];
    }

    if (!validDate(rule.startDate)) return [];
    if (rule.type === "DATE") {
      return inPeriod(rule.startDate)
        ? [{ ...common, type: "DATE", date: rule.startDate }]
        : [];
    }

    if (!validDate(rule.endDate) || !inPeriod(rule.startDate) || !inPeriod(rule.endDate)) return [];
    if (rule.startDate > rule.endDate) return [];
    return [{ ...common, type: "DATE_RANGE", startDate: rule.startDate, endDate: rule.endDate }];
  });

  return {
    availabilityRules,
    preferences: raw.preferences,
    summary: raw.summary,
  };
}

export function schedulePeriodLabel(
  schedule: Pick<Schedule, "startDate" | "durationDays">,
) {
  const end = addDays(parseISO(schedule.startDate), schedule.durationDays - 1);
  return `${schedule.startDate}〜${format(end, "yyyy-MM-dd")}`;
}
