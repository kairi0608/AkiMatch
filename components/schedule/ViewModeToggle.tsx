import { CalendarDays, ListChecks } from "lucide-react";

export type AvailabilityViewMode = "CANDIDATES" | "CALENDAR";

export function ViewModeToggle({
  value,
  onChange,
}: {
  value: AvailabilityViewMode;
  onChange: (value: AvailabilityViewMode) => void;
}) {
  return (
    <div className="view-mode-toggle" role="radiogroup" aria-label="日程の表示方法">
      <button
        type="button"
        role="radio"
        aria-checked={value === "CANDIDATES"}
        className={value === "CANDIDATES" ? "active" : ""}
        onClick={() => onChange("CANDIDATES")}
      >
        <ListChecks size={17} />候補だけ
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "CALENDAR"}
        className={value === "CALENDAR" ? "active" : ""}
        onClick={() => onChange("CALENDAR")}
      >
        <CalendarDays size={17} />全日程を見る
      </button>
    </div>
  );
}
