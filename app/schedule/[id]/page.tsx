"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Clipboard,
  Link2,
  Pencil,
  Trophy,
} from "lucide-react";
import type { Availability } from "@/types/availability";
import type { Participant } from "@/types/participant";
import type { Schedule } from "@/types/schedule";
import { selectCandidates } from "@/lib/scheduling/candidate-filter";
import { scheduleRepository } from "@/lib/storage/api-repository";
import {
  listResponseCredentials,
  responseManagementPath,
  saveResponseCredential,
  type ParticipantCredential,
} from "@/lib/storage/response-credentials";
import { AvailabilityResponseEditor } from "@/components/schedule/AvailabilityResponseEditor";
import { CandidateBanner } from "@/components/schedule/CandidateBanner";
import { CandidateSummary } from "@/components/schedule/CandidateSummary";
import { ExistingResponses } from "@/components/schedule/ExistingResponses";
import { ParticipantForm } from "@/components/schedule/ParticipantForm";

export default function SchedulePage() {
  const { id } = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [credentials, setCredentials] = useState<ParticipantCredential[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [submittedCredential, setSubmittedCredential] = useState<ParticipantCredential | null>(null);
  const [copied, setCopied] = useState<"SHARE" | "MANAGEMENT" | null>(null);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const bundle = await scheduleRepository.getBundle(id);
      setSchedule(bundle?.schedule ?? null);
      setParticipants(bundle?.participants ?? []);
      setAvailabilities(bundle?.availabilities ?? []);
      const participantIds = new Set((bundle?.participants ?? []).map((item) => item.id));
      setCredentials(
        listResponseCredentials(id).filter((credential) =>
          participantIds.has(credential.participantId),
        ),
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "日程調整を読み込めませんでした。");
    } finally {
      setLoaded(true);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const selection = useMemo(
    () => schedule ? selectCandidates(schedule, participants, availabilities) : null,
    [schedule, participants, availabilities],
  );

  const submitAnswer = async (
    participantName: string,
    response: Omit<Availability, "participantId">[],
  ) => {
    if (!schedule) return;
    const result = await scheduleRepository.addParticipantResponse(
      schedule.id,
      participantName,
      response,
    );
    const credential: ParticipantCredential = {
      scheduleId: schedule.id,
      participantId: result.participant.id,
      participantName: result.participant.name,
      editToken: result.editToken,
    };
    saveResponseCredential(credential);
    setSubmittedCredential(credential);
    setEditingName("");
    await load();
  };

  const copyShareUrl = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}`);
    setCopied("SHARE");
    window.setTimeout(() => setCopied(null), 1800);
  };

  const copyManagementUrl = async (credential: ParticipantCredential) => {
    await navigator.clipboard.writeText(
      `${window.location.origin}${responseManagementPath(credential)}`,
    );
    setCopied("MANAGEMENT");
    window.setTimeout(() => setCopied(null), 1800);
  };

  if (!loaded) return <div className="loading-state"><span /><p>日程を読み込んでいます…</p></div>;
  if (loadError) return <div className="empty-state page-empty"><strong>日程調整を読み込めませんでした</strong><p>{loadError}</p><button className="btn" type="button" onClick={() => { setLoaded(false); load(); }}>もう一度試す</button></div>;
  if (!schedule || !selection) return <div className="empty-state page-empty"><strong>この日程調整は見つかりませんでした</strong><p>URLを確認するか、作成者に新しい共有URLを確認してください。</p><Link className="btn" href="/create">日程調整を作成</Link></div>;

  return <div className="schedule-shell">
    <header className="schedule-heading">
      <div><span className="eyebrow">Schedule</span><h1>{schedule.title}</h1><p>{schedule.durationDays}日間 · {String(schedule.dailyStartHour).padStart(2, "0")}:00〜{String(schedule.dailyEndHour).padStart(2, "0")}:00 · {schedule.requiredDurationHours}時間</p></div>
      <div className="heading-actions"><button className="btn secondary compact" type="button" onClick={copyShareUrl}><Clipboard size={17} />{copied === "SHARE" ? "コピーしました" : "共有URLをコピー"}</button><Link className="btn secondary compact" href={`/result/${schedule.id}`}><Trophy size={17} />結果を見る</Link></div>
    </header>

    <CandidateBanner selection={selection} participantCount={participants.length} />
    <CandidateSummary selection={selection} participantCount={participants.length} />

    {submittedCredential && <div className="answer-complete response-complete"><CheckCircle2 /><div><strong>{submittedCredential.participantName}さんの回答を保存しました</strong><span>候補を再計算しました。管理リンクは別端末で修正するときに必要です。</span></div><div className="answer-complete-actions"><Link className="btn secondary compact" href={`/schedule/${schedule.id}/response/${submittedCredential.participantId}`}><Pencil size={16} />回答を修正する</Link><button className="btn secondary compact" type="button" onClick={() => copyManagementUrl(submittedCredential)}><Link2 size={16} />{copied === "MANAGEMENT" ? "コピーしました" : "回答管理リンクをコピー"}</button><Link className="btn compact" href={`/result/${schedule.id}`}>現在の結果を見る</Link></div></div>}

    {!editingName ? <>
      <ExistingResponses credentials={credentials} />
      <section className="answer-start"><div><span className="eyebrow">Your turn</span><h2>{credentials.length ? "別の参加者として回答" : "あなたの予定を教えてください"}</h2><p>最初は候補だけを表示します。全日程カレンダーや曜日・期間の一括入力も利用できます。</p></div><ParticipantForm onStart={(name) => { setSubmittedCredential(null); setEditingName(name); }} /></section>
    </> : <AvailabilityResponseEditor
      key={`new-${editingName}`}
      schedule={schedule}
      selection={selection}
      initialName={editingName}
      description="すべて「空いている」で開始します。難しい・参加できない時間だけを変更すると、少ない操作で回答できます。"
      submitLabel="回答を送信"
      onSubmit={submitAnswer}
    />}
  </div>;
}

