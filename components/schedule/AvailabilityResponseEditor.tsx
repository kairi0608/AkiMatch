"use client";

import { useMemo, useState } from "react";
import { getDay, parseISO } from "date-fns";
import { Save, Undo2 } from "lucide-react";
import type { AvailabilityRule } from "@/lib/ai/types";
import type { AIAvailabilityResponse, AvailabilitySourceMap } from "@/lib/ai/types";
import {
  AVAILABILITY_SOURCE,
  AVAILABILITY_STATUS,
  type Availability,
  type AvailabilityStatus,
} from "@/types/availability";
import type { Schedule } from "@/types/schedule";
import type { CandidateSelection } from "@/lib/scheduling/candidate-filter";
import {
  applyAvailabilityRules,
  copyDayToSameWeekday,
  type ApplyAvailabilityRulesResult,
} from "@/lib/scheduling/availability-rules";
import { generateDates, generateTimeSlots, slotKey } from "@/lib/scheduling/time-slots";
import { AIScheduleAssistant } from "./AIScheduleAssistant";
import { BulkAvailabilityEditor } from "./BulkAvailabilityEditor";
import { DayAvailabilityEditor } from "./DayAvailabilityEditor";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { ScheduleGrid } from "./ScheduleGrid";
import { ViewModeToggle, type AvailabilityViewMode } from "./ViewModeToggle";

export function AvailabilityResponseEditor({
  schedule,
  selection,
  initialName,
  initialStatuses,
  initialSources,
  defaultViewMode = "CANDIDATES",
  nameEditable = false,
  description,
  submitLabel,
  onSubmit,
}: {
  schedule: Schedule;
  selection: CandidateSelection;
  initialName: string;
  initialStatuses?: Record<string, AvailabilityStatus>;
  initialSources?: AvailabilitySourceMap;
  defaultViewMode?: AvailabilityViewMode;
  nameEditable?: boolean;
  description: string;
  submitLabel: string;
  onSubmit: (
    name: string,
    availability: Omit<Availability, "participantId">[],
  ) => Promise<void>;
}) {
  const allSlots = useMemo(() => generateTimeSlots(schedule), [schedule]);
  const allDates = useMemo(() => generateDates(schedule), [schedule]);
  const candidateKeys = useMemo(
    () => new Set(selection.slots.map(slotKey)),
    [selection.slots],
  );
  const [participantName, setParticipantName] = useState(initialName);
  const [statuses, setStatuses] = useState<Record<string, AvailabilityStatus>>(() =>
    Object.fromEntries(allSlots.map((slot) => [
      slotKey(slot),
      initialStatuses?.[slotKey(slot)] ?? AVAILABILITY_STATUS.AVAILABLE,
    ])),
  );
  const [sources, setSources] = useState<AvailabilitySourceMap>(() => ({
    ...initialSources,
  }));
  const [viewMode, setViewMode] = useState<AvailabilityViewMode>(defaultViewMode);
  const [selectedDate, setSelectedDate] = useState(allDates[0] ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [undoSnapshot, setUndoSnapshot] = useState<{
    statuses: Record<string, AvailabilityStatus>;
    sources: AvailabilitySourceMap;
    label: string;
  } | null>(null);
  const selectedDaySlots = useMemo(
    () => allSlots.filter((slot) => slot.date === selectedDate),
    [allSlots, selectedDate],
  );

  const applyBulkSlots = (
    slots: typeof allSlots,
    status: AvailabilityStatus,
    label: string,
  ) => {
    setUndoSnapshot({ statuses: { ...statuses }, sources: { ...sources }, label });
    setStatuses((current) => ({
      ...current,
      ...Object.fromEntries(slots.map((slot) => [slotKey(slot), status])),
    }));
    setSources((current) => ({
      ...current,
      ...Object.fromEntries(slots.map((slot) => [slotKey(slot), AVAILABILITY_SOURCE.MANUAL])),
    }));
  };

  const applyRule = (rule: AvailabilityRule, label: string) => {
    setUndoSnapshot({ statuses: { ...statuses }, sources: { ...sources }, label });
    const result = applyAvailabilityRules({ statuses, sources }, allSlots, [rule], {
      source: AVAILABILITY_SOURCE.MANUAL,
    });
    setStatuses(result.state.statuses);
    setSources(result.state.sources);
  };

  const copySameWeekday = (date: string) => {
    setUndoSnapshot({
      statuses: { ...statuses },
      sources: { ...sources },
      label: "同じ曜日へのコピー",
    });
    setStatuses((current) => copyDayToSameWeekday(current, allSlots, date));
    const weekday = getDay(parseISO(date));
    const copiedSlots = allSlots.filter(
      (slot) => getDay(parseISO(slot.date)) === weekday,
    );
    setSources((current) => ({
      ...current,
      ...Object.fromEntries(copiedSlots.map((slot) => [slotKey(slot), AVAILABILITY_SOURCE.MANUAL])),
    }));
  };

  const changeManually = (
    slot: (typeof allSlots)[number],
    status: AvailabilityStatus,
  ) => {
    const key = slotKey(slot);
    setStatuses((current) => ({ ...current, [key]: status }));
    setSources((current) => ({ ...current, [key]: AVAILABILITY_SOURCE.MANUAL }));
  };

  const applyAIResult = (
    result: ApplyAvailabilityRulesResult,
    _interpretation: AIAvailabilityResponse,
  ) => {
    setUndoSnapshot({
      statuses: { ...statuses },
      sources: { ...sources },
      label: `AI入力（${result.changedKeys.length}件）`,
    });
    setStatuses(result.state.statuses);
    setSources(result.state.sources);
    setViewMode("CALENDAR");
  };

  const undoBulk = () => {
    if (!undoSnapshot) return;
    setStatuses(undoSnapshot.statuses);
    setSources(undoSnapshot.sources);
    setUndoSnapshot(null);
  };

  const save = async () => {
    const normalizedName = participantName.trim();
    if (!normalizedName) {
      setError("お名前を入力してください。");
      return;
    }
    setSaving(true);
    setError("");
    const availability = allSlots.map((slot) => {
      const key = slotKey(slot);
      return {
        ...slot,
        status: statuses[key] ?? AVAILABILITY_STATUS.AVAILABLE,
        source: sources[key] ?? AVAILABILITY_SOURCE.MANUAL,
      };
    });
    try {
      await onSubmit(normalizedName, availability);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "回答を保存できませんでした。");
    } finally {
      setSaving(false);
    }
  };

  return <section className="answer-editor">
    <div className="editor-heading"><div><span className="eyebrow">Availability</span>{nameEditable ? <label className="response-name-field" htmlFor="response-participant-name"><span>回答者名</span><input id="response-participant-name" value={participantName} onChange={(event) => setParticipantName(event.target.value)} maxLength={40} autoComplete="name" required /></label> : <h2>{participantName}さんの予定</h2>}<p>{description}</p></div><ViewModeToggle value={viewMode} onChange={setViewMode} /></div>
    <div className="schedule-grid-wrap availability-workspace">
      <AIScheduleAssistant schedule={schedule} slots={allSlots} candidateKeys={candidateKeys} statuses={statuses} sources={sources} onApply={applyAIResult} />
      {viewMode === "CANDIDATES" ? <ScheduleGrid schedule={schedule} visibleSlots={selection.slots} statuses={statuses} sources={sources} onChange={changeManually} onBulkChange={applyBulkSlots} /> : <>
        <MonthlyCalendar dates={allDates} slots={allSlots} statuses={statuses} sources={sources} candidateKeys={candidateKeys} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        {selectedDate && <DayAvailabilityEditor date={selectedDate} slots={selectedDaySlots} statuses={statuses} sources={sources} onChange={changeManually} onBulkChange={applyBulkSlots} onCopySameWeekday={copySameWeekday} />}
      </>}
      <BulkAvailabilityEditor schedule={schedule} dates={allDates} onApply={applyRule} />
      {undoSnapshot && <div className="undo-bar" role="status"><span>「{undoSnapshot.label}」を反映しました</span><button type="button" onClick={undoBulk}><Undo2 size={16} />{undoSnapshot.label.startsWith("AI入力") ? "AI入力を元に戻す" : "元に戻す"}</button></div>}
    </div>
    {error && <p className="form-error response-editor-error" role="alert">{error}</p>}
    <div className="submit-bar"><div><strong>{allSlots.length}時間を回答</strong><span>期間内の全時間を安全に保存します</span></div><button className="btn" type="button" disabled={saving} onClick={save}>{saving ? "保存中…" : submitLabel} <Save size={18} /></button></div>
  </section>;
}

