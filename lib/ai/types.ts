import type {
  AvailabilitySource,
  AvailabilityStatus,
} from "@/types/availability";
import type { Schedule } from "@/types/schedule";

export const CONFIDENCE = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;

export type Confidence = (typeof CONFIDENCE)[keyof typeof CONFIDENCE];

interface AvailabilityRuleBase {
  id?: string;
  startHour: number;
  endHour: number;
  status: AvailabilityStatus;
  confidence?: Confidence;
  reason?: string;
}

export interface DateAvailabilityRule extends AvailabilityRuleBase {
  type: "DATE";
  date: string;
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

/** 手動一括・AI下書き・将来のテンプレート入力で共有するルール。 */
export type AvailabilityRule =
  | DateAvailabilityRule
  | DateRangeAvailabilityRule
  | WeekdayAvailabilityRule;

export type SchedulePreferenceType = "TIME_OF_DAY" | "WEEKDAY" | "GENERAL";

export interface SchedulePreference {
  type: SchedulePreferenceType;
  value: string;
  weight?: number;
  reason?: string;
}

export interface AIAvailabilityResponse {
  availabilityRules: AvailabilityRule[];
  preferences: SchedulePreference[];
  summary: string;
}

export type LifePattern = "STUDENT" | "EMPLOYEE" | "SHIFT" | "OTHER";
export type Busyness = "EASY" | "NORMAL" | "BUSY";
export type PreferredTime = "MORNING" | "AFTERNOON" | "EVENING" | "NONE";

export interface AIAvailabilityProfile {
  lifePattern: LifePattern;
  weekdayBusyness: Busyness;
  weekendBusyness: Busyness;
  preferredTime: PreferredTime;
}

export interface AIAvailabilityRequest {
  schedule: Pick<
    Schedule,
    "startDate" | "durationDays" | "dailyStartHour" | "dailyEndHour"
  >;
  text: string;
  profile: AIAvailabilityProfile;
}

export type AvailabilitySourceMap = Record<string, AvailabilitySource>;

export interface AvailabilityDraftState {
  statuses: Record<string, AvailabilityStatus>;
  sources: AvailabilitySourceMap;
}
