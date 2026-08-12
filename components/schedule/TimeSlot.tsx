import { Check, Minus, X } from "lucide-react";
import type { AvailabilityStatus } from "@/types/availability";
import type { TimeSlot as TimeSlotType } from "@/types/schedule";
import { STATUS_META } from "./status";

const icons = { AVAILABLE: Check, DIFFICULT: Minus, UNAVAILABLE: X };

export function TimeSlot({ slot, status, onChange }: { slot: TimeSlotType; status: AvailabilityStatus; onChange: (status: AvailabilityStatus) => void }) {
  const Icon = icons[status];
  const meta = STATUS_META[status];
  return <button type="button" className={`time-slot status-${status.toLowerCase()}`} onClick={() => onChange(meta.next)} aria-label={`${slot.date} ${slot.hour}時から：${meta.label}。押すと変更`} title={`${meta.label}（クリックで変更）`}><Icon size={16} strokeWidth={3} /><span>{meta.shortLabel}</span></button>;
}
