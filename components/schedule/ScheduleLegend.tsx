import { Check, Minus, X } from "lucide-react";

export function ScheduleLegend() {
  return <div className="schedule-legend" aria-label="予定状態の凡例"><span><i className="legend-available"><Check size={13} /></i>空いている</span><span><i className="legend-difficult"><Minus size={13} /></i>参加しづらい</span><span><i className="legend-unavailable"><X size={13} /></i>参加できない</span></div>;
}
