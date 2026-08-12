import { ChevronLeft, ChevronRight } from "lucide-react";

export function DateNavigator({ label, canPrevious, canNext, onPrevious, onNext }: { label: string; canPrevious: boolean; canNext: boolean; onPrevious: () => void; onNext: () => void }) {
  return <div className="date-navigator"><button type="button" onClick={onPrevious} disabled={!canPrevious} aria-label="前の日付へ"><ChevronLeft size={20} /></button><strong>{label}</strong><button type="button" onClick={onNext} disabled={!canNext} aria-label="次の日付へ"><ChevronRight size={20} /></button></div>;
}
