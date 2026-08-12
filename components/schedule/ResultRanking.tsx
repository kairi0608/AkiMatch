import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { Check, ChevronDown, Minus, Sparkles, X } from "lucide-react";
import { AVAILABILITY_STATUS } from "@/types/availability";
import type { RankedCandidate } from "@/lib/scheduling/scoring";

const time = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

export function ResultRanking({ candidates, participantCount }: { candidates: RankedCandidate[]; participantCount: number }) {
  if (!candidates.length) return <div className="empty-state"><strong>まだランキングを作れません</strong><p>参加者が回答すると、ここにおすすめ日時が表示されます。</p></div>;
  return <div className="ranking-list">{candidates.map((candidate) => {
    const available = candidate.participantStatuses.filter((item) => item.status === AVAILABILITY_STATUS.AVAILABLE);
    const difficult = candidate.participantStatuses.filter((item) => item.status === AVAILABILITY_STATUS.DIFFICULT);
    const unavailable = candidate.participantStatuses.filter((item) => item.status === AVAILABILITY_STATUS.UNAVAILABLE);
    return <details className={`ranking-card ${candidate.rank === 1 ? "top" : ""}`} key={`${candidate.window.date}-${candidate.window.startHour}`}>
      <summary>
        <span className="rank-number">{candidate.rank === 1 ? <Sparkles size={20} /> : candidate.rank}<small>おすすめ</small></span>
        <span className="rank-datetime"><small>{format(parseISO(candidate.window.date), "M月d日（E）", { locale: ja })}</small><strong>{time(candidate.window.startHour)} — {time(candidate.window.endHour)}</strong></span>
        <span className="rank-status"><strong>{candidate.availableCount} / {participantCount}人</strong><small>{candidate.unavailableCount === 0 && candidate.difficultCount === 0 ? "全員参加可能" : candidate.unavailableCount ? `${candidate.unavailableCount}人が参加不可` : `${candidate.difficultCount}人が参加しづらい`}</small></span>
        <ChevronDown className="rank-chevron" />
      </summary>
      <div className="participant-breakdown">
        <div className="breakdown-group available"><h4><Check />参加可能 <span>{available.length}</span></h4><p>{available.map((item) => item.participant.name).join("、") || "—"}</p></div>
        <div className="breakdown-group difficult"><h4><Minus />参加しづらい <span>{difficult.length}</span></h4><p>{difficult.map((item) => item.participant.name).join("、") || "—"}</p></div>
        <div className="breakdown-group unavailable"><h4><X />参加できない <span>{unavailable.length}</span></h4><p>{unavailable.map((item) => item.participant.name).join("、") || "—"}</p></div>
      </div>
    </details>;
  })}</div>;
}
