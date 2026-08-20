"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  Trophy,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import type { ParticipantManagementSummary } from "@/types/participant";
import type { Schedule } from "@/types/schedule";
import { scheduleRepository } from "@/lib/storage/api-repository";
import { removeResponseCredential } from "@/lib/storage/response-credentials";
import { DeleteResponseDialog } from "@/components/schedule/DeleteResponseDialog";

export default function ParticipantManagementPage() {
  const { id } = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [participants, setParticipants] = useState<ParticipantManagementSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ParticipantManagementSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const result = await scheduleRepository.getOwnedParticipants(id);
      setSchedule(result.schedule);
      setParticipants(result.participants);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "参加者一覧を読み込めませんでした。");
    } finally {
      setLoaded(true);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const deleteParticipant = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await scheduleRepository.deleteParticipantAsOwner(id, deleteTarget.id);
      removeResponseCredential(id, deleteTarget.id);
      setSuccess(`${deleteTarget.name}さんの回答を削除し、候補を再計算しました。`);
      setDeleteTarget(null);
      await load();
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "参加者の回答を削除できませんでした。");
    } finally {
      setDeleting(false);
    }
  };

  if (!loaded) return <div className="loading-state"><span /><p>参加者一覧を読み込んでいます…</p></div>;
  if (error || !schedule) {
    return <div className="empty-state page-empty"><ShieldCheck /><strong>参加者を管理できません</strong><p>{error || "日程作成者の権限を確認できませんでした。"}</p><Link className="btn secondary" href="/schedules"><ArrowLeft size={17} />過去の日程へ戻る</Link></div>;
  }

  return <div className="history-shell participant-management-shell">
    <header className="history-heading"><div><span className="eyebrow"><UsersRound size={14} /> Participant management</span><h1>参加者の回答を管理</h1><p>「{schedule.title}」の作成者だけが、登録時期に関係なく回答を削除できます。</p></div><div className="participant-heading-actions"><Link className="btn secondary compact" href={`/result/${id}`}><Trophy size={16} />結果を見る</Link><Link className="btn secondary compact" href="/schedules"><ArrowLeft size={16} />一覧へ戻る</Link></div></header>

    <div className="participant-management-note"><ShieldCheck size={20} /><div><strong>名前ではなく回答IDで削除します</strong><p>同姓同名でも別の回答として区別されます。削除すると、その参加者の予定もまとめて削除されます。</p></div></div>

    {success && <div className="response-update-success" role="status"><CheckCircle2 size={20} /><div><strong>削除しました</strong><span>{success}</span></div></div>}

    {participants.length === 0 ? <div className="empty-state participant-empty"><UsersRound /><strong>回答した参加者はいません</strong><p>参加者が回答すると、ここに表示されます。</p></div> : <div className="participant-management-list">{participants.map((participant) => <article key={participant.id} className="participant-management-card">
      <div className="participant-avatar"><UserRoundCheck size={21} /></div>
      <div className="participant-management-details"><h2>{participant.name}</h2><p><CalendarDays size={14} />{format(parseISO(participant.createdAt), "yyyy年M月d日 HH:mm", { locale: ja })}に回答</p><div><span>{participant.availabilityCount}時間を登録</span><span className={participant.canSelfManage ? "self-manage-enabled" : "legacy-response"}>{participant.canSelfManage ? "本人管理リンクあり" : "旧回答"}</span><small>回答ID …{participant.id.slice(-8)}</small></div></div>
      <button className="participant-delete-button" type="button" onClick={() => { setDeleteError(""); setDeleteTarget(participant); }}><Trash2 size={16} />この回答を削除</button>
    </article>)}</div>}

    {deleteTarget && <DeleteResponseDialog participantName={deleteTarget.name} deleting={deleting} error={deleteError} onCancel={() => { if (!deleting) setDeleteTarget(null); }} onConfirm={deleteParticipant} />}
  </div>;
}

