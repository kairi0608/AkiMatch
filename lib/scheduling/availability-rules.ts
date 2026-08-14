import { getDay, isWithinInterval, parseISO } from "date-fns";
import type {
  AvailabilityDraftState,
  AvailabilityRule,
} from "../ai/types";
import {
  AVAILABILITY_SOURCE,
  AVAILABILITY_STATUS,
  type AvailabilitySource,
  type AvailabilityStatus,
} from "../../types/availability";
import type { TimeSlot } from "../../types/schedule";
import { slotKey } from "./time-slots";

export type AvailabilityStatusMap = Record<string, AvailabilityStatus>;

export function slotsMatchingRule(
  slots: TimeSlot[],
  rule: AvailabilityRule,
): TimeSlot[] {
  return slots.filter((slot) => {
    const matchesTime =
      slot.hour >= rule.startHour && slot.hour < rule.endHour;
    if (!matchesTime) return false;

    if (rule.type === "WEEKDAY") {
      return rule.weekdays.includes(getDay(parseISO(slot.date)));
    }

    if (rule.type === "DATE") return slot.date === rule.date;

    return isWithinInterval(parseISO(slot.date), {
      start: parseISO(rule.startDate),
      end: parseISO(rule.endDate),
    });
  });
}

export interface ApplyAvailabilityRulesOptions {
  source?: AvailabilitySource;
  preserveManual?: boolean;
}

export interface ApplyAvailabilityRulesResult {
  state: AvailabilityDraftState;
  changedKeys: string[];
  skippedManualKeys: string[];
}

/**
 * 曜日一括・期間一括・AI下書きで共有する純粋関数。
 * AI適用時は preserveManual=true にして MANUAL > AI を保証する。
 */
export function applyAvailabilityRules(
  state: AvailabilityDraftState,
  slots: TimeSlot[],
  rules: AvailabilityRule[],
  options: ApplyAvailabilityRulesOptions = {},
): ApplyAvailabilityRulesResult {
  const source = options.source ?? AVAILABILITY_SOURCE.MANUAL;
  const statuses = { ...state.statuses };
  const sources = { ...state.sources };
  const changed = new Set<string>();
  const skipped = new Set<string>();

  for (const rule of rules) {
    for (const slot of slotsMatchingRule(slots, rule)) {
      const key = slotKey(slot);
      if (
        options.preserveManual &&
        sources[key] === AVAILABILITY_SOURCE.MANUAL
      ) {
        skipped.add(key);
        continue;
      }
      statuses[key] = rule.status;
      sources[key] = source;
      changed.add(key);
    }
  }

  return {
    state: { statuses, sources },
    changedKeys: [...changed],
    skippedManualKeys: [...skipped],
  };
}

export function applyAvailabilityRule(
  statuses: AvailabilityStatusMap,
  slots: TimeSlot[],
  rule: AvailabilityRule,
): AvailabilityStatusMap {
  const next = { ...statuses };
  for (const slot of slotsMatchingRule(slots, rule)) {
    next[slotKey(slot)] = rule.status;
  }
  return next;
}

export function copyDayToSameWeekday(
  statuses: AvailabilityStatusMap,
  slots: TimeSlot[],
  sourceDate: string,
): AvailabilityStatusMap {
  const source = slots.filter((slot) => slot.date === sourceDate);
  const sourceByHour = new Map(
    source.map((slot) => [
      slot.hour,
      statuses[slotKey(slot)] ?? AVAILABILITY_STATUS.AVAILABLE,
    ]),
  );
  const weekday = getDay(parseISO(sourceDate));
  const next = { ...statuses };

  for (const slot of slots) {
    if (getDay(parseISO(slot.date)) !== weekday) continue;
    const status = sourceByHour.get(slot.hour);
    if (status) next[slotKey(slot)] = status;
  }
  return next;
}

export interface DayAvailabilitySummary {
  totalHours: number;
  candidateHours: number;
  availableHours: number;
  difficultHours: number;
  unavailableHours: number;
}

export function summarizeDayAvailability(
  date: string,
  slots: TimeSlot[],
  statuses: AvailabilityStatusMap,
  candidateKeys: ReadonlySet<string>,
): DayAvailabilitySummary {
  const daySlots = slots.filter((slot) => slot.date === date);
  const summary: DayAvailabilitySummary = {
    totalHours: daySlots.length,
    candidateHours: 0,
    availableHours: 0,
    difficultHours: 0,
    unavailableHours: 0,
  };

  for (const slot of daySlots) {
    const key = slotKey(slot);
    if (candidateKeys.has(key)) summary.candidateHours += 1;
    const status = statuses[key] ?? AVAILABILITY_STATUS.AVAILABLE;
    if (status === AVAILABILITY_STATUS.AVAILABLE) summary.availableHours += 1;
    if (status === AVAILABILITY_STATUS.DIFFICULT) summary.difficultHours += 1;
    if (status === AVAILABILITY_STATUS.UNAVAILABLE) summary.unavailableHours += 1;
  }
  return summary;
}
