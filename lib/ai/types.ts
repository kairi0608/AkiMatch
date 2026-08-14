import type { Availability, AvailabilityStatus } from "@/types/availability";
import type { Schedule } from "@/types/schedule";

interface AvailabilityRuleBase {
  startHour: number;
  endHour: number;
  status: AvailabilityStatus;
}

export interface DateRangeAvailabilityRule extends AvailabilityRuleBase {
  type: "DATE_RANGE";
  startDate: string;
  endDate: string;
}

export interface WeekdayAvailabilityRule extends AvailabilityRuleBase {
  type: "WEEKDAY";
  /** date-fns の getDay と同じく 0=日曜、1=月曜 ... 6=土曜 */
  weekdays: number[];
}

/** 将来の自然言語入力が返す、画面の一括入力と共通の構造化ルール。 */
export type AvailabilityRule =
  | DateRangeAvailabilityRule
  | WeekdayAvailabilityRule;

export interface NaturalLanguageAvailabilityRequest {
  schedule: Schedule;
  participantId: string;
  text: string;
}

export interface NaturalLanguageAvailabilityResult {
  changes: Availability[];
  rules?: AvailabilityRule[];
  explanation: string;
}

export interface AvailabilityInterpreter {
  interpret(
    request: NaturalLanguageAvailabilityRequest,
  ): Promise<NaturalLanguageAvailabilityResult>;
}
