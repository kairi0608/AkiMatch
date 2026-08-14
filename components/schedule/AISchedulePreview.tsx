"use client";

import { useMemo, useState } from "react";
import type { AvailabilityDraftState } from "@/lib/ai/types";
import type { TimeSlot } from "@/types/schedule";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { DayAvailabilityEditor } from "./DayAvailabilityEditor";

export function AISchedulePreview({
  dates,
  slots,
  candidateKeys,
  draft,
}: {
  dates: string[];
  slots: TimeSlot[];
  candidateKeys: ReadonlySet<string>;
  draft: AvailabilityDraftState;
}) {
  const [selectedDate, setSelectedDate] = useState(dates[0] ?? "");
  const daySlots = useMemo(
    () => slots.filter((slot) => slot.date === selectedDate),
    [slots, selectedDate],
  );

  return (
    <div className="ai-calendar-preview">
      <div className="ai-preview-note"><strong>30日間への仮反映</strong><span>「AI」ラベルの時間だけがAIによる下書きです。まだ保存も正式反映もされていません。</span></div>
      <MonthlyCalendar
        dates={dates}
        slots={slots}
        statuses={draft.statuses}
        sources={draft.sources}
        candidateKeys={candidateKeys}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
      {selectedDate && <DayAvailabilityEditor
        date={selectedDate}
        slots={daySlots}
        statuses={draft.statuses}
        sources={draft.sources}
        readOnly
      />}
    </div>
  );
}
