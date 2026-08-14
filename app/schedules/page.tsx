"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Clock3,
  History,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { Schedule } from "@/types/schedule";
import { scheduleRepository } from "@/lib/storage/api-repository";

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    scheduleRepository
      .listSchedules()
      .then(setSchedules)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "過去の日程を読み込めませんでした。"),
      )
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!deleteTarget) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) setDeleteTarget(null);
    };
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [deleteTarget, deleting]);

  const openDeleteDialog = (schedule: Schedule) => {
    setDeleteError("");
    setDeleteTarget(schedule);
  };

  const deleteSchedule = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await scheduleRepository.deleteSchedule(deleteTarget.id);
      setSchedules((current) => current.filter((schedule) => schedule.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "日程調整を削除できませんでした。");
    } finally {
      setDeleting(false);
    }
  };

  return <div className="history-shell">
    <header className="history-heading"><div><span className="eyebrow"><History size={14} /> History</span><h1>過去の日程調整</h1><p>この端末で作成した日程調整を、新しい順に表示します。</p></div><Link className="btn" href="/create"><Plus size={18} />新しく作成</Link></header>
    {!loaded ? <div className="loading-state"><span /><p>日程を読み込んでいます…</p></div> : error ? <div className="empty-state"><strong>一覧を読み込めませんでした</strong><p>{error}</p></div> : schedules.length === 0 ? <div className="empty-state history-empty"><CalendarDays /><strong>作成済みの日程はありません</strong><p>最初の日程調整を作成すると、ここからいつでも開けます。</p><Link className="btn" href="/create">日程調整を作成</Link></div> : <div className="history-list">{schedules.map((schedule) => <article className="history-card" key={schedule.id}>
      <div className="history-date"><strong>{format(parseISO(schedule.startDate), "M/d", { locale: ja })}</strong><span>{format(parseISO(schedule.startDate), "yyyy", { locale: ja })}</span></div>
      <div className="history-details"><h2>{schedule.title}</h2><p><CalendarDays size={15} />{format(parseISO(schedule.startDate), "yyyy年M月d日", { locale: ja })}から{schedule.durationDays}日間</p><p><Clock3 size={15} />{String(schedule.dailyStartHour).padStart(2, "0")}:00〜{String(schedule.dailyEndHour).padStart(2, "0")}:00 · {schedule.requiredDurationHours}時間</p></div>
      <div className="history-actions"><button className="history-delete-button" type="button" onClick={() => openDeleteDialog(schedule)}><Trash2 size={15} />削除</button><Link className="btn secondary compact" href={`/result/${schedule.id}`}>結果</Link><Link className="btn compact" href={`/schedule/${schedule.id}`}>開く <ArrowRight size={16} /></Link></div>
    </article>)}</div>}

    {deleteTarget && <div className="delete-dialog-backdrop" role="presentation">
      <section className="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
        <button className="delete-dialog-close" type="button" aria-label="削除確認を閉じる" disabled={deleting} onClick={() => setDeleteTarget(null)}><X size={18} /></button>
        <span className="delete-warning-icon"><AlertTriangle size={24} /></span>
        <small>Delete schedule</small>
        <h2 id="delete-dialog-title">「{deleteTarget.title}」を削除しますか？</h2>
        <p id="delete-dialog-description">日程調整、参加者、すべての回答が削除され、共有URLも開けなくなります。この操作は元に戻せません。</p>
        {deleteError && <p className="delete-dialog-error" role="alert">{deleteError}</p>}
        <div className="delete-dialog-actions"><button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)}>キャンセル</button><button className="confirm-delete-button" type="button" disabled={deleting} onClick={deleteSchedule}>{deleting ? <><LoaderCircle className="spin-icon" size={17} />削除中…</> : <><Trash2 size={17} />削除する</>}</button></div>
      </section>
    </div>}
  </div>;
}
