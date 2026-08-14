import { Check, Minus, X } from "lucide-react";
import { AVAILABILITY_SOURCE, type AvailabilitySource, type AvailabilityStatus } from "@/types/availability";
import type { TimeSlot as TimeSlotType } from "@/types/schedule";
import { STATUS_META } from "./status";

const icons = { AVAILABLE: Check, DIFFICULT: Minus, UNAVAILABLE: X };

export function TimeSlot({ slot, status, selectedStatus, source, disabled = false, onChange }: { slot: TimeSlotType; status: AvailabilityStatus; selectedStatus: AvailabilityStatus; source?: AvailabilitySource; disabled?: boolean; onChange: (status: AvailabilityStatus) => void }) {
  const Icon = icons[status];
  const meta = STATUS_META[status];
  const selectedMeta = STATUS_META[selectedStatus];
  return <button type="button" disabled={disabled} className={`time-slot status-${status.toLowerCase()}`} onClick={() => onChange(selectedStatus)} aria-label={`${slot.date} ${slot.hour}時から：現在は${meta.label}${source === AVAILABILITY_SOURCE.AI ? "、AIの下書き" : ""}${disabled ? "" : `。押すと${selectedMeta.label}に設定`}`} title={`現在：${meta.label}${source === AVAILABILITY_SOURCE.AI ? "／AIの下書き" : ""}`}><Icon size={16} strokeWidth={3} /><span>{meta.shortLabel}</span>{source === AVAILABILITY_SOURCE.AI && <em className="ai-slot-badge">AI</em>}</button>;
}
