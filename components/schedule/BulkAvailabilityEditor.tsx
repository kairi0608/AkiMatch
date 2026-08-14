"use client";

import { useEffect, useState } from "react";
import { CalendarRange, Check, Minus, X } from "lucide-react";
import type { AvailabilityRule } from "@/lib/ai/types";
import {
  AVAILABILITY_STATUS,
  type AvailabilityStatus,
} from "@/types/availability";
import type { Schedule } from "@/types/schedule";
import { generateHours } from "@/lib/scheduling/time-slots";
import { STATUS_META } from "./status";

const WEEKDAYS = [
  { value: 0, label: "日" }, { value: 1, label: "月" },
  { value: 2, label: "火" }, { value: 3, label: "水" },
  { value: 4, label: "木" }, { value: 5, label: "金" },
  { value: 6, label: "土" },
];
const STATUS_OPTIONS = [
  { status: AVAILABILITY_STATUS.AVAILABLE, Icon: Check },
  { status: AVAILABILITY_STATUS.DIFFICULT, Icon: Minus },
  { status: AVAILABILITY_STATUS.UNAVAILABLE, Icon: X },
] as const;

export function BulkAvailabilityEditor({
  schedule,
  dates,
  onApply,
}: {
  schedule: Schedule;
  dates: string[];
  onApply: (rule: AvailabilityRule, label: string) => void;
}) {
  const hours = generateHours(schedule);
  const endHours = hours.map((hour) => hour + 1);
  const [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState(dates[0] ?? "");
  const [endDate, setEndDate] = useState(dates[dates.length - 1] ?? "");
  const [startHour, setStartHour] = useState(schedule.dailyStartHour);
  const [endHour, setEndHour] = useState(schedule.dailyEndHour);
  const [status, setStatus] = useState<AvailabilityStatus>(AVAILABILITY_STATUS.UNAVAILABLE);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setStartDate(dates[0] ?? "");
    setEndDate(dates[dates.length - 1] ?? "");
  }, [dates.join("|")]);

  const validateTime = () => {
    if (startHour >= endHour) {
      setMessage("開始時刻より後の終了時刻を選んでください。");
      return false;
    }
    return true;
  };

  const applyWeekdays = () => {
    if (!weekdays.length) {
      setMessage("曜日を1つ以上選んでください。");
      return;
    }
    if (!validateTime()) return;
    onApply({ type: "WEEKDAY", weekdays, startHour, endHour, status }, "曜日指定を一括設定");
    setMessage(`選択した曜日の${startHour}:00〜${endHour}:00を「${STATUS_META[status].label}」に設定しました。`);
  };

  const applyDateRange = () => {
    if (!startDate || !endDate || startDate > endDate) {
      setMessage("開始日と終了日を確認してください。");
      return;
    }
    if (!validateTime()) return;
    onApply({ type: "DATE_RANGE", startDate, endDate, startHour, endHour, status }, "期間指定を一括設定");
    setMessage(`${startDate}〜${endDate}の${startHour}:00〜${endHour}:00を「${STATUS_META[status].label}」に設定しました。`);
  };

  return (
    <section className="bulk-availability-editor">
      <div className="custom-bulk-heading">
        <span><CalendarRange size={18} /></span>
        <div><strong>まとめて予定を入力</strong><small>曜日または期間と時間帯を指定できます。あとから1時間ずつ修正できます。</small></div>
      </div>
      <div className="bulk-common-fields">
        <label>開始時刻<select value={startHour} onChange={(event) => setStartHour(Number(event.target.value))}>{hours.map((hour) => <option value={hour} key={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label>
        <label>終了時刻<select value={endHour} onChange={(event) => setEndHour(Number(event.target.value))}>{endHours.map((hour) => <option value={hour} key={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label>
        <div className="bulk-status-field"><span>状態</span><div className="status-picker compact-picker" role="radiogroup" aria-label="一括設定する状態">{STATUS_OPTIONS.map(({ status: option, Icon }) => <button key={option} type="button" role="radio" aria-checked={status === option} className={`status-choice choice-${option.toLowerCase()} ${status === option ? "selected" : ""}`} onClick={() => setStatus(option)}><Icon size={15} />{STATUS_META[option].shortLabel}</button>)}</div></div>
      </div>
      <div className="bulk-rule-block">
        <div className="bulk-rule-title"><strong>1. 曜日で一括</strong><div className="weekday-shortcuts"><button type="button" onClick={() => setWeekdays([1, 2, 3, 4, 5])}>平日</button><button type="button" onClick={() => setWeekdays([0, 6])}>週末</button><button type="button" onClick={() => setWeekdays([0, 1, 2, 3, 4, 5, 6])}>一週間</button></div></div>
        <div className="weekday-picker">{WEEKDAYS.map((day) => <button type="button" className={weekdays.includes(day.value) ? "selected" : ""} aria-pressed={weekdays.includes(day.value)} key={day.value} onClick={() => setWeekdays((current) => current.includes(day.value) ? current.filter((value) => value !== day.value) : [...current, day.value])}>{day.label}</button>)}</div>
        <button className="bulk-apply-button" type="button" onClick={applyWeekdays}>選択した曜日へ反映</button>
      </div>
      <div className="bulk-rule-block">
        <div className="bulk-rule-title"><strong>2. 期間で一括</strong><small>日付範囲と上の時間帯・状態を使います</small></div>
        <div className="date-range-fields"><label>開始日<input type="date" min={dates[0]} max={dates[dates.length - 1]} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>終了日<input type="date" min={dates[0]} max={dates[dates.length - 1]} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><button className="bulk-apply-button" type="button" onClick={applyDateRange}>この期間へ反映</button></div>
      </div>
      {message && <p className="bulk-message" role="status">{message}</p>}
    </section>
  );
}
