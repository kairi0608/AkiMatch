"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarCheck2, ListFilter, Sparkles, UsersRound } from "lucide-react";
import type { Availability } from "@/types/availability";
import type { Participant } from "@/types/participant";
import type { Schedule } from "@/types/schedule";
import { rankCandidates } from "@/lib/scheduling/scoring";
import { scheduleRepository } from "@/lib/storage/api-repository";
import { ResultRanking } from "@/components/schedule/ResultRanking";

export default function ResultPage() {
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

  const ranking = useMemo(() => schedule ? rankCandidates(schedule, participants, availabilities, 10) : [], [schedule, participants, availabilities]);

  if (!loaded) return <div className="loading-state"><span /><p>結果を計算しています…</p></div>;
  if (error || !schedule) return <div className="empty-state page-empty"><strong>結果が見つかりませんでした</strong><p>{error}</p><Link className="btn" href="/">ホームへ戻る</Link></div>;

  const best = ranking[0];
  return <div className="result-shell">
    <Link className="back-link" href={`/schedule/${schedule.id}`}><ArrowLeft size={17} />回答画面へ戻る</Link>
    <header className="result-heading"><span className="eyebrow"><Sparkles size={14} /> Results</span><h1>{schedule.title}</h1><p>{participants.length}人の回答をもとに、参加しやすい順で並べました。</p></header>
    <div className="result-overview"><div className="overview-icon"><CalendarCheck2 /></div><div><span>いちばんおすすめ</span><strong>{best ? `${best.availableCount}人が参加可能` : "回答をお待ちしています"}</strong><p>{best ? "参加不可を最優先で避け、参加しづらさと候補の公平性も考慮しています。" : "回答が1件以上集まると、自動でランキングします。"}</p></div><div className="response-count"><UsersRound /><strong>{participants.length}</strong><span>回答</span></div></div>
    <section className="ranking-section"><div className="section-head"><div><span className="eyebrow">Ranking</span><h2>おすすめ日時</h2></div><div className="section-head-actions"><small>候補を開くと参加状況を確認できます</small><Link className="btn secondary compact" href={`/result/${id}/all`}><ListFilter size={16} />期間内の全候補を見る</Link></div></div><ResultRanking candidates={ranking} participantCount={participants.length} /></section>
  </div>;
}
