import { CalendarDays, Clock3, UsersRound } from "lucide-react";
import type { CandidateSelection } from "@/lib/scheduling/candidate-filter";

export function CandidateSummary({ selection, participantCount }: { selection: CandidateSelection; participantCount: number }) {
  return <div className="candidate-summary"><div><UsersRound /><strong>{participantCount}</strong><span>回答済み</span></div><div><CalendarDays /><strong>{new Set(selection.slots.map((slot) => slot.date)).size}</strong><span>候補日</span></div><div><Clock3 /><strong>{selection.windows.length}</strong><span>候補時間</span></div></div>;
}
