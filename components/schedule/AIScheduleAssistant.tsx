"use client";

import { useState } from "react";
import { CalendarSearch, LoaderCircle, Sparkles, WandSparkles, X } from "lucide-react";
import { AVAILABILITY_SOURCE, type AvailabilityStatus } from "@/types/availability";
import type { Schedule, TimeSlot } from "@/types/schedule";
import type {
  AIAvailabilityProfile,
  AIAvailabilityResponse,
  AvailabilityDraftState,
  AvailabilitySourceMap,
} from "@/lib/ai/types";
import { aiAvailabilityResponseSchema } from "@/lib/ai/schemas";
import { applyAvailabilityRules, type ApplyAvailabilityRulesResult } from "@/lib/scheduling/availability-rules";
import { generateDates } from "@/lib/scheduling/time-slots";
import { AIInterpretationSummary } from "./AIInterpretationSummary";
import { AISchedulePreview } from "./AISchedulePreview";

const MAX_LENGTH = 1600;
const PLACEHOLDER = "平日は大学があります。水曜は比較的空いています。火木は夕方からバイトがあることが多いです。土日は基本空いています。できれば午後に集まりたいです。";

export function AIScheduleAssistant({
  schedule,
  slots,
  candidateKeys,
  statuses,
  sources,
  onApply,
}: {
  schedule: Schedule;
  slots: TimeSlot[];
  candidateKeys: ReadonlySet<string>;
  statuses: Record<string, AvailabilityStatus>;
  sources: AvailabilitySourceMap;
  onApply: (result: ApplyAvailabilityRulesResult, interpretation: AIAvailabilityResponse) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [profile, setProfile] = useState<AIAvailabilityProfile>({
    lifePattern: "STUDENT",
    weekdayBusyness: "NORMAL",
    weekendBusyness: "EASY",
    preferredTime: "NONE",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [interpretation, setInterpretation] = useState<AIAvailabilityResponse | null>(null);
  const [preview, setPreview] = useState<ApplyAvailabilityRulesResult | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const analyze = async () => {
    const normalizedText = text.trim();
    if (!normalizedText) {
      setError("普段の予定を自由記述へ入力してください。");
      return;
    }
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch("/api/ai/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule: {
            startDate: schedule.startDate,
            durationDays: schedule.durationDays,
            dailyStartHour: schedule.dailyStartHour,
            dailyEndHour: schedule.dailyEndHour,
          },
          text: normalizedText,
          profile,
        }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || "AI入力を処理できませんでした。");
      }
      const parsed = aiAvailabilityResponseSchema.safeParse(body);
      if (!parsed.success) throw new Error("AIの解析結果を安全に読み取れませんでした。もう一度お試しください。");
      const nextPreview = applyAvailabilityRules(
        { statuses, sources },
        slots,
        parsed.data.availabilityRules,
        { source: AVAILABILITY_SOURCE.AI, preserveManual: true },
      );
      setInterpretation(parsed.data);
      setPreview(nextPreview);
      setShowCalendar(false);
    } catch (cause) {
      setError(cause instanceof DOMException && cause.name === "AbortError"
        ? "AIの応答に時間がかかっています。しばらくしてから再度お試しください。"
        : cause instanceof Error ? cause.message : "AI入力を処理できませんでした。");
    } finally {
      window.clearTimeout(timer);
      setLoading(false);
    }
  };

  const resetInterpretation = () => {
    setInterpretation(null);
    setPreview(null);
    setShowCalendar(false);
    setError("");
  };

  const applyConfirmed = () => {
    if (!interpretation) return;
    // 解析後に手動変更があっても、最新stateを基準に再展開してMANUALを守る。
    const latest = applyAvailabilityRules(
      { statuses, sources },
      slots,
      interpretation.availabilityRules,
      { source: AVAILABILITY_SOURCE.AI, preserveManual: true },
    );
    onApply(latest, interpretation);
    setOpen(false);
    resetInterpretation();
  };

  if (!open) {
    return (
      <button className="ai-assistant-launch" type="button" onClick={() => setOpen(true)}>
        <span><WandSparkles size={21} /></span><div><strong>AIにまとめて入力</strong><small>普段の生活を文章で伝えて、30日分の下書きを作る</small></div><Sparkles size={18} />
      </button>
    );
  }

  return (
    <section className="ai-assistant-panel">
      <div className="ai-panel-heading"><div><span><WandSparkles size={19} /></span><div><small>AI schedule draft</small><h3>AIに予定の下書きを頼む</h3><p>AIが80〜90%を仮入力します。確認してから反映し、違う部分だけ手動で直せます。</p></div></div><button type="button" aria-label="AI入力を閉じる" onClick={() => setOpen(false)}><X size={18} /></button></div>

      {!interpretation || !preview ? <>
        <div className="ai-profile-grid">
          <label>普段の生活<select value={profile.lifePattern} onChange={(event) => setProfile({ ...profile, lifePattern: event.target.value as AIAvailabilityProfile["lifePattern"] })}><option value="STUDENT">学生</option><option value="EMPLOYEE">会社員</option><option value="SHIFT">シフト勤務</option><option value="OTHER">その他</option></select></label>
          <label>平日は<select value={profile.weekdayBusyness} onChange={(event) => setProfile({ ...profile, weekdayBusyness: event.target.value as AIAvailabilityProfile["weekdayBusyness"] })}><option value="EASY">空きやすい</option><option value="NORMAL">普通</option><option value="BUSY">忙しい</option></select></label>
          <label>土日は<select value={profile.weekendBusyness} onChange={(event) => setProfile({ ...profile, weekendBusyness: event.target.value as AIAvailabilityProfile["weekendBusyness"] })}><option value="EASY">空きやすい</option><option value="NORMAL">普通</option><option value="BUSY">忙しい</option></select></label>
          <label>集まりやすい時間<select value={profile.preferredTime} onChange={(event) => setProfile({ ...profile, preferredTime: event.target.value as AIAvailabilityProfile["preferredTime"] })}><option value="MORNING">午前</option><option value="AFTERNOON">午後</option><option value="EVENING">夜</option><option value="NONE">特になし</option></select></label>
        </div>
        <label className="ai-text-field"><span>普段の生活や予定、参加しやすい時間を自由に書いてください。</span><textarea maxLength={MAX_LENGTH} rows={6} value={text} placeholder={PLACEHOLDER} onChange={(event) => setText(event.target.value)} disabled={loading} /><small>{text.length} / {MAX_LENGTH}文字</small></label>
        {error && <p className="ai-error" role="alert">{error}</p>}
        <button className="ai-analyze-button" type="button" disabled={loading} onClick={analyze}>{loading ? <><LoaderCircle className="spin-icon" size={18} />予定を整理しています…</> : <><Sparkles size={18} />AIに予定を作ってもらう</>}</button>
      </> : <>
        <AIInterpretationSummary result={interpretation} />
        {preview.skippedManualKeys.length > 0 && <p className="ai-manual-preserved">手動で設定済みの{preview.skippedManualKeys.length}件は変更しません。</p>}
        {showCalendar && <AISchedulePreview dates={generateDates(schedule)} slots={slots} candidateKeys={candidateKeys} draft={preview.state as AvailabilityDraftState} />}
        <div className="ai-preview-actions"><button className="btn secondary compact" type="button" onClick={() => setShowCalendar((current) => !current)}><CalendarSearch size={17} />{showCalendar ? "解釈内容へ戻る" : "カレンダーで確認"}</button><button className="btn secondary compact" type="button" onClick={resetInterpretation}>修正する</button><button className="btn compact" type="button" onClick={applyConfirmed}>この内容を反映</button></div>
      </>}
    </section>
  );
}
