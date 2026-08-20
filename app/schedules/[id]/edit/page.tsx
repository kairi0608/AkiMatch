"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  Pencil,
} from "lucide-react";
import { scheduleRepository } from "@/lib/storage/api-repository";

export default function EditSchedulePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const scheduleId = params.id;
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(22);
  const [requiredHours, setRequiredHours] = useState(2);
  const [hasResponses, setHasResponses] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    scheduleRepository.getBundle(scheduleId)
      .then((bundle) => {
        if (!bundle) {
          setLoadError("この日程調整は見つかりませんでした。");
          return;
        }
        const { schedule, participants } = bundle;
        setTitle(schedule.title);
        setStartDate(schedule.startDate);
        setDurationDays(schedule.durationDays);
        setStartHour(schedule.dailyStartHour);
        setEndHour(schedule.dailyEndHour);
        setRequiredHours(schedule.requiredDurationHours);
        setHasResponses(participants.length > 0);
      })
      .catch((cause) => {
        setLoadError(cause instanceof Error ? cause.message : "日程調整を読み込めませんでした。");
      })
      .finally(() => setLoaded(true));
  }, [scheduleId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError("日程調整のタイトルを入力してください。");
    if (endHour - startHour < requiredHours) {
      return setError("対象時間帯を、必要な予定時間より長く設定してください。");
    }
    setSaving(true);
    setError("");
    try {
      await scheduleRepository.updateSchedule(scheduleId, {
        title: title.trim(),
        startDate,
        durationDays,
        dailyStartHour: startHour,
        dailyEndHour: endHour,
        requiredDurationHours: requiredHours,
      });
      router.push("/schedules");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "日程調整を修正できませんでした。");
      setSaving(false);
    }
  };

  if (!loaded) {
    return <div className="loading-state edit-loading"><span /><p>日程調整を読み込んでいます…</p></div>;
  }

  if (loadError) {
    return <div className="empty-state edit-empty"><strong>日程調整を修正できません</strong><p>{loadError}</p><Link className="btn secondary" href="/schedules"><ArrowLeft size={17} />一覧へ戻る</Link></div>;
  }

  return <div className="create-shell edit-schedule-shell">
    <header className="page-heading left"><span className="eyebrow"><Pencil size={14} /> Edit schedule</span><h1>日程調整を修正</h1><p>間違えて登録したタイトルや日程条件を修正できます。</p></header>
    <form className="create-card" onSubmit={submit}>
      <section><div className="form-section-title"><span>1</span><div><h2>予定について</h2><p>タイトルは回答後も変更できます。</p></div></div><label htmlFor="schedule-title">日程調整タイトル<input id="schedule-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} required /></label></section>
      <section>
        <div className="form-section-title"><span>2</span><div><h2>日付の範囲</h2><p>開始日と調整日数を修正します。</p></div></div>
        {hasResponses && <div className="edit-locked-note" role="note"><LockKeyhole size={18} /><div><strong>回答があるため日時条件を保護しています</strong><p>参加者の回答を壊さないよう、タイトルだけ変更できます。</p></div></div>}
        <div className="form-grid"><label><CalendarDays />開始日<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} disabled={hasResponses} required /></label><label><CalendarDays />調整日数<select value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value))} disabled={hasResponses}>{[7, 14, 21, 30, 45, 60].map((days) => <option value={days} key={days}>{days}日間</option>)}</select></label></div>
      </section>
      <section><div className="form-section-title"><span>3</span><div><h2>時間の条件</h2><p>開始・終了時刻と必要な時間を修正します。</p></div></div><div className="form-grid three"><label><Clock3 />開始時刻<select value={startHour} onChange={(event) => setStartHour(Number(event.target.value))} disabled={hasResponses}>{Array.from({ length: 16 }, (_, index) => index + 6).map((hour) => <option value={hour} key={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label><label><Clock3 />終了時刻<select value={endHour} onChange={(event) => setEndHour(Number(event.target.value))} disabled={hasResponses}>{Array.from({ length: 16 }, (_, index) => index + 9).map((hour) => <option value={hour} key={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label><label><Clock3 />必要な時間<select value={requiredHours} onChange={(event) => setRequiredHours(Number(event.target.value))} disabled={hasResponses}>{[1, 2, 3, 4].map((hour) => <option value={hour} key={hour}>{hour}時間</option>)}</select></label></div></section>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="create-submit edit-submit"><Link className="btn secondary" href="/schedules"><ArrowLeft size={17} />キャンセル</Link><button className="btn" type="submit" disabled={saving}>{saving ? <><LoaderCircle className="spin-icon" size={18} />保存中…</> : <><Check size={18} />変更を保存</>}</button></div>
    </form>
  </div>;
}

