"use client";

import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { Check, Copy, Minus, X } from "lucide-react";
import {
  AVAILABILITY_STATUS,
  type AvailabilitySource,
  type AvailabilityStatus,
} from "@/types/availability";
import type { TimeSlot as TimeSlotType } from "@/types/schedule";
import { slotKey } from "@/lib/scheduling/time-slots";
import { TimeSlot } from "./TimeSlot";
import { STATUS_META } from "./status";
import { useState } from "react";

const STATUS_OPTIONS = [
  { status: AVAILABILITY_STATUS.AVAILABLE, Icon: Check },
  { status: AVAILABILITY_STATUS.DIFFICULT, Icon: Minus },
  { status: AVAILABILITY_STATUS.UNAVAILABLE, Icon: X },
] as const;

export function DayAvailabilityEditor({
  date,
  slots,
  statuses,
  sources = {},
  readOnly = false,
  onChange,
  onBulkChange,
  onCopySameWeekday,
}: {
  date: string;
  slots: TimeSlotType[];
  statuses: Record<string, AvailabilityStatus>;
  sources?: Record<string, AvailabilitySource>;
  readOnly?: boolean;
  onChange?: (slot: TimeSlotType, status: AvailabilityStatus) => void;
  onBulkChange?: (slots: TimeSlotType[], status: AvailabilityStatus, label: string) => void;
  onCopySameWeekday?: (date: string) => void;
}) {
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus>(
    AVAILABILITY_STATUS.UNAVAILABLE,
  );
  const label = format(parseISO(date), "M月d日（E）", { locale: ja });

  return (
    <section className="day-availability-editor">
      <div className="day-editor-heading">
        <div><span>{readOnly ? "AI下書きの確認" : "選択した日を編集"}</span><h3>{label}</h3></div>
        {!readOnly && <button className="bulk-button" type="button" onClick={() => onCopySameWeekday?.(date)}>
          <Copy size={16} />同じ曜日の全日へコピー
        </button>}
      </div>
      {!readOnly && <div className="status-picker compact-picker" role="radiogroup" aria-label="この日の入力状態">
        {STATUS_OPTIONS.map(({ status, Icon }) => (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={selectedStatus === status}
            className={`status-choice choice-${status.toLowerCase()} ${selectedStatus === status ? "selected" : ""}`}
            onClick={() => setSelectedStatus(status)}
          >
            <Icon size={16} strokeWidth={3} />{STATUS_META[status].label}
          </button>
        ))}
      </div>}
      {!readOnly && <button
        className="day-bulk-button"
        type="button"
        onClick={() => onBulkChange?.(slots, selectedStatus, `${label}を一括設定`)}
      >
        この日をすべて「{STATUS_META[selectedStatus].label}」にする
      </button>}
      <div className="day-hour-list">
        {slots.map((slot) => (
          <div className="day-hour-row" key={slotKey(slot)}>
            <span><strong>{String(slot.hour).padStart(2, "0")}:00</strong><small>〜 {String(slot.hour + 1).padStart(2, "0")}:00</small></span>
            <TimeSlot
              slot={slot}
              status={statuses[slotKey(slot)] ?? AVAILABILITY_STATUS.AVAILABLE}
              selectedStatus={selectedStatus}
              source={sources[slotKey(slot)]}
              disabled={readOnly}
              onChange={(status) => onChange?.(slot, status)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
