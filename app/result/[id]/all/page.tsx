"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ListFilter } from "lucide-react";
import type { Availability } from "@/types/availability";
import type { Participant } from "@/types/participant";
import type { Schedule } from "@/types/schedule";
import { rankCandidates } from "@/lib/scheduling/scoring";
import { scheduleRepository } from "@/lib/storage/api-repository";
import { ResultRanking } from "@/components/schedule/ResultRanking";

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

  return <div className="result-shell"><Link className="back-link" href={`/result/${id}`}><ArrowLeft size={17} />おすすめ結果へ戻る</Link><header className="result-heading"><span className="eyebrow"><ListFilter size={14} /> All candidates</span><h1>期間内の全候補</h1><p>{schedule.title} · {ranking.length}件を参加しやすい順に表示しています。</p></header><ResultRanking candidates={ranking} participantCount={participants.length} /></div>;
}
