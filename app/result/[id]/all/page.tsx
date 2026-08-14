"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import type { Availability } from "@/types/availability";
import type { Participant } from "@/types/participant";
import type { Schedule } from "@/types/schedule";
import { rankCandidates } from "@/lib/scheduling/scoring";
import { generateDates } from "@/lib/scheduling/time-slots";
import { scheduleRepository } from "@/lib/storage/api-repository";
import { ResultsCalendar } from "@/components/schedule/ResultsCalendar";

export default function AllResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    scheduleRepository.getBundle(id).then((bundle) => {
      setSchedule(bundle?.schedule ?? null);
      setParticipants(bundle?.participants ?? []);
      setAvailabilities(bundle?.availabilities ?? []);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "結果を読み込めませんでした。"))
      .finally(() => setLoaded(true));
  }, [id]);

  const ranking = useMemo(() => schedule ? rankCandidates(schedule, participants, availabilities) : [], [schedule, participants, availabilities]);

  if (!loaded) return <div className="loading-state"><span /><p>全候補を計算しています…</p></div>;
  if (error || !schedule) return <div className="empty-state page-empty"><strong>全候補を表示できませんでした</strong><p>{error || "日程調整が見つかりません。"}</p></div>;

  return <div className="result-shell"><Link className="back-link" href={`/result/${id}`}><ArrowLeft size={17} />おすすめ結果へ戻る</Link><header className="result-heading"><span className="eyebrow"><CalendarDays size={14} /> All candidates</span><h1>期間内の全候補カレンダー</h1><p>{schedule.title} · 選択期間の全日を月ごとに表示しています。日付を選ぶと、その日の全候補を確認できます。</p></header><ResultsCalendar dates={generateDates(schedule)} candidates={ranking} participantCount={participants.length} /></div>;
}
