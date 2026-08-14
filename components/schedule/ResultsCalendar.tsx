"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarCheck2, ChevronRight } from "lucide-react";
import type { RankedCandidate } from "@/lib/scheduling/scoring";
import { groupDatesByMonth } from "@/lib/scheduling/calendar";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const time = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

export function ResultsCalendar({
  dates,
  candidates,
  participantCount,
}: {
  dates: string[];
  candidates: RankedCandidate[];
  participantCount: number;
}) {
  const byDate = useMemo(() => {
    const groups = new Map<string, RankedCandidate[]>();
    for (const candidate of candidates) {
      groups.set(candidate.window.date, [
        ...(groups.get(candidate.window.date) ?? []),
        candidate,
      ]);
    }
    return groups;
  }, [candidates]);
  const firstCandidateDate = dates.find((date) => byDate.has(date)) ?? dates[0] ?? "";
  const [selectedDate, setSelectedDate] = useState(firstCandidateDate);
  const selectedCandidates = byDate.get(selectedDate) ?? [];

  return (
    <div className="results-calendar-layout">
      <div className="monthly-calendar-list result-calendar-list">
        {groupDatesByMonth(dates).map((month) => (
          <section className="calendar-month" key={month.key}>
            <h2>{month.label}</h2>
            <div className="calendar-weekdays" aria-hidden="true">
              {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
            </div>
            <div className="calendar-grid">
              {Array.from({ length: month.leadingBlanks }, (_, index) => <span className="calendar-blank" key={`leading-${index}`} />)}
              {month.dates.map((date) => {
                const daily = byDate.get(date) ?? [];
                const best = daily[0];
                return (
                  <button
                    type="button"
                    className={`calendar-day result-day ${selectedDate === date ? "selected" : ""}`}
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    aria-label={`${format(parseISO(date), "M月d日EEEE", { locale: ja })}、候補${daily.length}件${best ? `、最高${best.availableCount}人参加可能` : ""}`}
                  >
                    <strong>{format(parseISO(date), "d")}</strong>
                    {best ? <><span className="candidate">{time(best.window.startHour)}〜</span><small>{daily.length}件 · {best.availableCount}/{participantCount}人</small></> : <><span className="muted">候補なし</span><small>—</small></>}
                  </button>
                );
              })}
              {Array.from({ length: month.trailingBlanks }, (_, index) => <span className="calendar-blank" key={`trailing-${index}`} />)}
            </div>
          </section>
        ))}
      </div>

      <section className="result-day-detail">
        <div className="result-day-detail-heading"><span><CalendarCheck2 size={17} />選択日の全候補</span><h2>{selectedDate ? format(parseISO(selectedDate), "M月d日（E）", { locale: ja }) : "日付を選択"}</h2><p>{selectedCandidates.length}件の候補を参加しやすい順で表示</p></div>
        {selectedCandidates.length ? <div className="daily-candidate-list">{selectedCandidates.map((candidate) => (
          <details key={`${candidate.window.date}-${candidate.window.startHour}`}>
            <summary><span><strong>{time(candidate.window.startHour)}〜{time(candidate.window.endHour)}</strong><small>{candidate.availableCount}/{participantCount}人が参加可能</small></span><span>全体 #{candidate.rank}<ChevronRight size={16} /></span></summary>
            <div><span>参加しづらい {candidate.difficultCount}人</span><span>参加できない {candidate.unavailableCount}人</span><span>評価スコア {candidate.score}</span></div>
          </details>
        ))}</div> : <div className="calendar-detail-empty"><strong>この日の候補はありません</strong><p>必要な連続時間を確保できる時間帯がありません。</p></div>}
      </section>
    </div>
  );
}
