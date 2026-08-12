"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Clipboard, Eye, EyeOff, Send, Trophy } from "lucide-react";
import { AVAILABILITY_SOURCE, AVAILABILITY_STATUS, type Availability, type AvailabilityStatus } from "@/types/availability";
import type { Participant } from "@/types/participant";
import type { Schedule } from "@/types/schedule";
import { selectCandidates } from "@/lib/scheduling/candidate-filter";
import { generateTimeSlots, slotKey } from "@/lib/scheduling/time-slots";
import { scheduleRepository } from "@/lib/storage/prototype-repository";
import { CandidateBanner } from "@/components/schedule/CandidateBanner";
import { CandidateSummary } from "@/components/schedule/CandidateSummary";
import { ParticipantForm } from "@/components/schedule/ParticipantForm";
import { ScheduleGrid } from "@/components/schedule/ScheduleGrid";

export default function SchedulePage() {
  const { id } = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [editing, setEditing] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, AvailabilityStatus>>({});
  const [submittedName, setSubmittedName] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    const found = scheduleRepository.getSchedule(id);
    setSchedule(found);
    setParticipants(scheduleRepository.getParticipants(id));
    setAvailabilities(scheduleRepository.getAvailabilities(id));
    setLoaded(true);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const selection = useMemo(() => schedule ? selectCandidates(schedule, participants, availabilities) : null, [schedule, participants, availabilities]);
  const allSlots = useMemo(() => schedule ? generateTimeSlots(schedule) : [], [schedule]);
  const visibleSlots = viewAll ? allSlots : (selection?.slots ?? []);

  const startAnswer = (name: string) => {
    if (!selection) return;
    setParticipantName(name);
    setStatuses(Object.fromEntries(selection.slots.map((slot) => [slotKey(slot), AVAILABILITY_STATUS.AVAILABLE])));
    setSubmittedName("");
    setEditing(true);
  };

  const toggleAll = () => {
    if (!viewAll) setStatuses((current) => ({ ...Object.fromEntries(allSlots.map((slot) => [slotKey(slot), AVAILABILITY_STATUS.AVAILABLE])), ...current }));
    setViewAll((current) => !current);
  };

  const submitAnswer = () => {
    if (!schedule || !participantName.trim()) return;
    const response = Object.entries(statuses).map(([key, status]) => {
      const [date, hour] = key.split(":");
      return { date, hour: Number(hour), status, source: AVAILABILITY_SOURCE.MANUAL };
    });
    scheduleRepository.addParticipantResponse(schedule.id, participantName, response);
    setSubmittedName(participantName);
    setParticipantName("");
    setStatuses({});
    setEditing(false);
    setViewAll(false);
    load();
  };

  if (!loaded) return <div className="loading-state"><span /><p>日程を読み込んでいます…</p></div>;
  if (!schedule || !selection) return <div className="empty-state page-empty"><strong>この日程調整は見つかりませんでした</strong><p>URLを確認するか、新しい日程調整を作成してください。</p><Link className="btn" href="/create">日程調整を作成</Link></div>;

  return <div className="schedule-shell">
    <header className="schedule-heading">
      <div><span className="eyebrow">Schedule</span><h1>{schedule.title}</h1><p>{schedule.durationDays}日間 · {String(schedule.dailyStartHour).padStart(2, "0")}:00〜{String(schedule.dailyEndHour).padStart(2, "0")}:00 · {schedule.requiredDurationHours}時間</p></div>
      <div className="heading-actions"><button className="btn secondary compact" type="button" onClick={async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); }}><Clipboard size={17} />{copied ? "コピーしました" : "共有URLをコピー"}</button><Link className="btn secondary compact" href={`/result/${schedule.id}`}><Trophy size={17} />結果を見る</Link></div>
    </header>

    <CandidateBanner selection={selection} participantCount={participants.length} />
    <CandidateSummary selection={selection} participantCount={participants.length} />

    {submittedName && <div className="answer-complete"><CheckCircle2 /><div><strong>{submittedName}さんの回答を保存しました</strong><span>候補を再計算しました。この画面を次の方へ渡せます。</span></div><Link className="btn compact" href={`/result/${schedule.id}`}>現在の結果</Link></div>}

    {!editing ? <section className="answer-start"><div><span className="eyebrow">Your turn</span><h2>あなたの予定を教えてください</h2><p>現在の有効候補だけを表示します。回答は数分で終わります。</p></div><ParticipantForm onStart={startAnswer} /></section> : <section className="answer-editor">
      <div className="editor-heading"><div><span className="eyebrow">Availability</span><h2>{participantName}さんの予定</h2><p>最初はすべて「空いている」です。入力する状態を選び、個別または日・週単位で設定してください。</p></div><button className="text-button" type="button" onClick={toggleAll}>{viewAll ? <EyeOff size={17} /> : <Eye size={17} />}{viewAll ? "候補だけに戻す" : "すべての日程を見る"}</button></div>
      <ScheduleGrid schedule={schedule} visibleSlots={visibleSlots} statuses={statuses} onChange={(slot, status) => setStatuses((current) => ({ ...current, [slotKey(slot)]: status }))} onBulkChange={(slots, status) => setStatuses((current) => ({ ...current, ...Object.fromEntries(slots.map((slot) => [slotKey(slot), status])) }))} />
      <div className="submit-bar"><div><strong>{Object.keys(statuses).length}時間を回答</strong><span>{viewAll ? "全日程を表示中" : "候補時間のみ表示中"}</span></div><button className="btn" type="button" onClick={submitAnswer}>回答を送信 <Send size={18} /></button></div>
    </section>}
  </div>;
}
