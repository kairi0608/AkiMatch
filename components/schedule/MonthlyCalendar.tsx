import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import {
  AVAILABILITY_SOURCE,
  type AvailabilitySource,
  type AvailabilityStatus,
} from "@/types/availability";
import type { TimeSlot } from "@/types/schedule";
import { groupDatesByMonth } from "@/lib/scheduling/calendar";
import { summarizeDayAvailability } from "@/lib/scheduling/availability-rules";
import { slotKey } from "@/lib/scheduling/time-slots";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function MonthlyCalendar({
  dates,
  slots,
  statuses,
  sources = {},
  candidateKeys,
  selectedDate,
  onSelectDate,
}: {
  dates: string[];
  slots: TimeSlot[];
  statuses: Record<string, AvailabilityStatus>;
  sources?: Record<string, AvailabilitySource>;
  candidateKeys: ReadonlySet<string>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  return (
    <div className="monthly-calendar-list">
      {groupDatesByMonth(dates).map((month) => (
        <section className="calendar-month" key={month.key}>
          <h3>{month.label}</h3>
          <div className="calendar-weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className="calendar-grid">
            {Array.from({ length: month.leadingBlanks }, (_, index) => (
              <span className="calendar-blank" key={`leading-${index}`} />
            ))}
            {month.dates.map((date) => {
              const summary = summarizeDayAvailability(date, slots, statuses, candidateKeys);
              const aiHours = slots.filter(
                (slot) => slot.date === date && sources[slotKey(slot)] === AVAILABILITY_SOURCE.AI,
              ).length;
              return (
                <button
                  type="button"
                  className={`calendar-day ${selectedDate === date ? "selected" : ""}`}
                  key={date}
                  onClick={() => onSelectDate(date)}
                  aria-label={`${format(parseISO(date), "M月d日EEEE", { locale: ja })}、候補${summary.candidateHours}時間、参加不可${summary.unavailableHours}時間`}
                >
                  <strong>{format(parseISO(date), "d")}</strong>
                  {aiHours > 0 && <em className="ai-calendar-badge">AI {aiHours}</em>}
                  <span className={summary.candidateHours ? "candidate" : "muted"}>
                    候補 {summary.candidateHours}時間
                  </span>
                  <small className={summary.unavailableHours ? "has-unavailable" : ""}>
                    {summary.unavailableHours ? `不可 ${summary.unavailableHours}時間` : summary.difficultHours ? `難しい ${summary.difficultHours}時間` : "すべて空き"}
                  </small>
                </button>
              );
            })}
            {Array.from({ length: month.trailingBlanks }, (_, index) => (
              <span className="calendar-blank" key={`trailing-${index}`} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
