import { Info, Sparkles } from "lucide-react";
import type { CandidateSelection } from "@/lib/scheduling/candidate-filter";

export function CandidateBanner({ selection, participantCount }: { selection: CandidateSelection; participantCount: number }) {
  if (participantCount === 0) return <div className="candidate-banner neutral"><Info size={20} /><div><strong>最初の回答です</strong><span>対象期間のすべての時間を入力してください。</span></div></div>;
  if (selection.mode === "MIN_CONFLICT") return <div className="candidate-banner fallback"><Sparkles size={21} /><div><strong>参加しやすい時間を候補にしています</strong><span>全員が完全に空いている時間がないため、参加できない人が最も少ない時間帯を表示しています。</span></div></div>;
  return <div className="candidate-banner success"><Sparkles size={21} /><div><strong>全員が空いている候補です</strong><span>{participantCount}人の回答から、共通する時間だけに絞りました。</span></div></div>;
}
