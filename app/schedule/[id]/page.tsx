"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Clipboard, Send, Trophy, Undo2 } from "lucide-react";
import { getDay, parseISO } from "date-fns";
import type { AvailabilityRule } from "@/lib/ai/types";
import type { AIAvailabilityResponse, AvailabilitySourceMap } from "@/lib/ai/types";
import { AVAILABILITY_SOURCE, AVAILABILITY_STATUS, type Availability, type AvailabilityStatus } from "@/types/availability";
import type { Participant } from "@/types/participant";
import type { Schedule } from "@/types/schedule";
import { selectCandidates } from "@/lib/scheduling/candidate-filter";
import { generateDates, generateTimeSlots, slotKey } from "@/lib/scheduling/time-slots";
import { applyAvailabilityRules, copyDayToSameWeekday, type ApplyAvailabilityRulesResult } from "@/lib/scheduling/availability-rules";
import { scheduleRepository } from "@/lib/storage/api-repository";
import { CandidateBanner } from "@/components/schedule/CandidateBanner";
import { CandidateSummary } from "@/components/schedule/CandidateSummary";
import { ParticipantForm } from "@/components/schedule/ParticipantForm";
import { ScheduleGrid } from "@/components/schedule/ScheduleGrid";
import { BulkAvailabilityEditor } from "@/components/schedule/BulkAvailabilityEditor";
import { DayAvailabilityEditor } from "@/components/schedule/DayAvailabilityEditor";
import { MonthlyCalendar } from "@/components/schedule/MonthlyCalendar";
import { ViewModeToggle, type AvailabilityViewMode } from "@/components/schedule/ViewModeToggle";
import { AIScheduleAssistant } from "@/components/schedule/AIScheduleAssistant";

export default function SchedulePage() {
  const { id } = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [editing, setEditing] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, AvailabilityStatus>>({});
  const [sources, setSources] = useState<AvailabilitySourceMap>({});
  const [submittedName, setSubmittedName] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<AvailabilityViewMode>("CANDIDATES");
  const [selectedDate, setSelectedDate] = useState("");
  const [undoSnapshot, setUndoSnapshot] = useState<{ statuses: Record<string, AvailabilityStatus>; sources: AvailabilitySourceMap; label: string } | null>(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const bundle = await scheduleRepository.getBundle(id);
      setSchedule(bundle?.schedule ?? null);
      setParticipants(bundle?.participants ?? []);
      setAvailabilities(bundle?.availabilities ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "日程調整を読み込めませんでした。");
    } finally {
      setLoaded(true);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const selection = useMemo(() => schedule ? selectCandidates(schedule, participants, availabilities) : null, [schedule, participants, availabilities]);
  const allSlots = useMemo(() => schedule ? generateTimeSlots(schedule) : [], [schedule]);
  const allDates = useMemo(() => schedule ? generateDates(schedule) : [], [schedule]);
  const candidateKeys = useMemo(() => new Set((selection?.slots ?? []).map(slotKey)), [selection]);
  const visibleSlots = selection?.slots ?? [];
  const selectedDaySlots = useMemo(() => allSlots.filter((slot) => slot.date === selectedDate), [allSlots, selectedDate]);

  const startAnswer = (name: string) => {
    if (!selection) return;
    setParticipantName(name);
    setStatuses(Object.fromEntries(allSlots.map((slot) => [slotKey(slot), AVAILABILITY_STATUS.AVAILABLE])));
    setSources({});
    setSubmittedName("");
    setViewMode("CANDIDATES");
    setSelectedDate(allDates[0] ?? "");
    setUndoSnapshot(null);
    setEditing(true);
  };

  const applyBulkSlots = (slots: typeof allSlots, status: AvailabilityStatus, label: string) => {
    setUndoSnapshot({ statuses: { ...statuses }, sources: { ...sources }, label });
    setStatuses((current) => ({ ...current, ...Object.fromEntries(slots.map((slot) => [slotKey(slot), status])) }));
    setSources((current) => ({ ...current, ...Object.fromEntries(slots.map((slot) => [slotKey(slot), AVAILABILITY_SOURCE.MANUAL])) }));
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
    setUndoSnapshot({ statuses: { ...statuses }, sources: { ...sources }, label: "同じ曜日へのコピー" });
    setStatuses((current) => copyDayToSameWeekday(current, allSlots, date));
    const weekday = getDay(parseISO(date));
    const copiedSlots = allSlots.filter((slot) => getDay(parseISO(slot.date)) === weekday);
    setSources((current) => ({ ...current, ...Object.fromEntries(copiedSlots.map((slot) => [slotKey(slot), AVAILABILITY_SOURCE.MANUAL])) }));
  };

  const changeManually = (slot: (typeof allSlots)[number], status: AvailabilityStatus) => {
    const key = slotKey(slot);
    setStatuses((current) => ({ ...current, [key]: status }));
    setSources((current) => ({ ...current, [key]: AVAILABILITY_SOURCE.MANUAL }));
  };

  const applyAIResult = (result: ApplyAvailabilityRulesResult, _interpretation: AIAvailabilityResponse) => {
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

  const submitAnswer = async () => {
    if (!schedule || !participantName.trim()) return;
    setSaving(true);
    const response = Object.entries(statuses).map(([key, status]) => {
      const [date, hour] = key.split(":");
      return { date, hour: Number(hour), status, source: sources[key] ?? AVAILABILITY_SOURCE.MANUAL };
    });
    try {
      await scheduleRepository.addParticipantResponse(schedule.id, participantName, response);
      setSubmittedName(participantName);
      setParticipantName("");
      setStatuses({});
      setSources({});
      setEditing(false);
      await load();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "回答を保存できませんでした。");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="loading-state"><span /><p>日程を読み込んでいます…</p></div>;
  if (loadError) return <div className="empty-state page-empty"><strong>日程調整を読み込めませんでした</strong><p>{loadError}</p><button className="btn" type="button" onClick={() => { setLoaded(false); load(); }}>もう一度試す</button></div>;
  if (!schedule || !selection) return <div className="empty-state page-empty"><strong>この日程調整は見つかりませんでした</strong><p>URLを確認するか、作成者に新しい共有URLを確認してください。</p><Link className="btn" href="/create">日程調整を作成</Link></div>;

  return <div className="schedule-shell">
    <header className="schedule-heading">
      <div><span className="eyebrow">Schedule</span><h1>{schedule.title}</h1><p>{schedule.durationDays}日間 · {String(schedule.dailyStartHour).padStart(2, "0")}:00〜{String(schedule.dailyEndHour).padStart(2, "0")}:00 · {schedule.requiredDurationHours}時間</p></div>
      <div className="heading-actions"><button className="btn secondary compact" type="button" onClick={async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); }}><Clipboard size={17} />{copied ? "コピーしました" : "共有URLをコピー"}</button><Link className="btn secondary compact" href={`/result/${schedule.id}`}><Trophy size={17} />結果を見る</Link></div>
    </header>

    <CandidateBanner selection={selection} participantCount={participants.length} />
    <CandidateSummary selection={selection} participantCount={participants.length} />

    {submittedName && <div className="answer-complete"><CheckCircle2 /><div><strong>{submittedName}さんの回答を保存しました</strong><span>候補を再計算しました。この画面を次の方へ渡せます。</span></div><Link className="btn compact" href={`/result/${schedule.id}`}>現在の結果</Link></div>}

    {!editing ? <section className="answer-start"><div><span className="eyebrow">Your turn</span><h2>あなたの予定を教えてください</h2><p>最初は候補だけを表示します。全日程カレンダーや曜日・期間の一括入力も利用できます。</p></div><ParticipantForm onStart={startAnswer} /></section> : <section className="answer-editor">
      <div className="editor-heading"><div><span className="eyebrow">Availability</span><h2>{participantName}さんの予定</h2><p>すべて「空いている」で開始します。難しい・参加できない時間だけを変更すると、少ない操作で回答できます。</p></div><ViewModeToggle value={viewMode} onChange={setViewMode} /></div>
      <div className="schedule-grid-wrap availability-workspace">
        <AIScheduleAssistant schedule={schedule} slots={allSlots} candidateKeys={candidateKeys} statuses={statuses} sources={sources} onApply={applyAIResult} />
        {viewMode === "CANDIDATES" ? <ScheduleGrid schedule={schedule} visibleSlots={visibleSlots} statuses={statuses} sources={sources} onChange={changeManually} onBulkChange={applyBulkSlots} /> : <>
          <MonthlyCalendar dates={allDates} slots={allSlots} statuses={statuses} sources={sources} candidateKeys={candidateKeys} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          {selectedDate && <DayAvailabilityEditor date={selectedDate} slots={selectedDaySlots} statuses={statuses} sources={sources} onChange={changeManually} onBulkChange={applyBulkSlots} onCopySameWeekday={copySameWeekday} />}
        </>}
        <BulkAvailabilityEditor schedule={schedule} dates={allDates} onApply={applyRule} />
        {undoSnapshot && <div className="undo-bar" role="status"><span>「{undoSnapshot.label}」を反映しました</span><button type="button" onClick={undoBulk}><Undo2 size={16} />{undoSnapshot.label.startsWith("AI入力") ? "AI入力を元に戻す" : "元に戻す"}</button></div>}
      </div>
      {loadError && <p className="form-error" role="alert">{loadError}</p>}
      <div className="submit-bar"><div><strong>{Object.keys(statuses).length}時間を回答</strong><span>期間内の全時間を保存します</span></div><button className="btn" type="button" disabled={saving} onClick={submitAnswer}>{saving ? "保存中…" : "回答を送信"} <Send size={18} /></button></div>
    </section>}
  </div>;
}
