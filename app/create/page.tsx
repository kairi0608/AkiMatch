"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowRight, CalendarDays, Clock3, Sparkles } from "lucide-react";
import { scheduleRepository } from "@/lib/storage/api-repository";

export default function CreateSchedulePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [durationDays, setDurationDays] = useState(30);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(22);
  const [requiredHours, setRequiredHours] = useState(2);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError("日程調整のタイトルを入力してください。");
    if (endHour - startHour < requiredHours) return setError("対象時間帯を、必要な予定時間より長く設定してください。");
    setSaving(true);
    setError("");
    try {
      const schedule = await scheduleRepository.createSchedule({ title: title.trim(), startDate, durationDays, dailyStartHour: startHour, dailyEndHour: endHour, requiredDurationHours: requiredHours });
      router.push(`/schedule/${schedule.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "日程調整を作成できませんでした。");
      setSaving(false);
    }
  };

  return <div className="create-shell">
    <header className="page-heading left"><span className="eyebrow"><Sparkles size={14} /> New schedule</span><h1>日程調整を作成</h1><p>日付を一つずつ登録する必要はありません。範囲を決めれば、候補を自動で用意します。</p></header>
    <form className="create-card" onSubmit={submit}>
      <section><div className="form-section-title"><span>1</span><div><h2>予定について</h2><p>参加者に伝わる名前をつけましょう。</p></div></div><label htmlFor="schedule-title">日程調整タイトル<input id="schedule-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例：プロジェクトキックオフ" maxLength={80} required /></label></section>
      <section><div className="form-section-title"><span>2</span><div><h2>日付の範囲</h2><p>開始日から指定日数分を自動生成します。</p></div></div><div className="form-grid"><label><CalendarDays />開始日<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label><label><CalendarDays />調整日数<select value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value))}>{[7, 14, 21, 30, 45, 60].map((days) => <option value={days} key={days}>{days}日間</option>)}</select></label></div></section>
      <section><div className="form-section-title"><span>3</span><div><h2>時間の条件</h2><p>1時間単位で、連続した候補を探します。</p></div></div><div className="form-grid three"><label><Clock3 />開始時刻<select value={startHour} onChange={(event) => setStartHour(Number(event.target.value))}>{Array.from({ length: 16 }, (_, index) => index + 6).map((hour) => <option value={hour} key={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label><label><Clock3 />終了時刻<select value={endHour} onChange={(event) => setEndHour(Number(event.target.value))}>{Array.from({ length: 16 }, (_, index) => index + 9).map((hour) => <option value={hour} key={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label><label><Clock3 />必要な時間<select value={requiredHours} onChange={(event) => setRequiredHours(Number(event.target.value))}>{[1, 2, 3, 4].map((hour) => <option value={hour} key={hour}>{hour}時間</option>)}</select></label></div></section>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="create-submit"><p>作成後、まずあなたの予定を入力します。</p><button className="btn" type="submit" disabled={saving}>{saving ? "作成中…" : "日程調整を作成"} <ArrowRight size={19} /></button></div>
    </form>
  </div>;
}
