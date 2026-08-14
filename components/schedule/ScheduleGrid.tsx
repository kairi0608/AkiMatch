"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import {
  CalendarDays,
  Check,
  Minus,
  MoveHorizontal,
  X,
} from "lucide-react";
import {
  AVAILABILITY_STATUS,
  type AvailabilitySource,
  type AvailabilityStatus,
} from "@/types/availability";
import type { Schedule, TimeSlot as TimeSlotType } from "@/types/schedule";
import { generateHours, slotKey } from "@/lib/scheduling/time-slots";
import { DateNavigator } from "./DateNavigator";
import { TimeSlot } from "./TimeSlot";
import { STATUS_META } from "./status";

const PAGE_SIZE = 7;
const STATUS_OPTIONS = [
  { status: AVAILABILITY_STATUS.AVAILABLE, Icon: Check },
  { status: AVAILABILITY_STATUS.DIFFICULT, Icon: Minus },
  { status: AVAILABILITY_STATUS.UNAVAILABLE, Icon: X },
] as const;

const formatDate = (date: string) =>
  format(parseISO(date), "M月d日（E）", { locale: ja });

export function ScheduleGrid({
  schedule,
  visibleSlots,
  statuses,
  sources = {},
  onChange,
  onBulkChange,
}: {
  schedule: Schedule;
  visibleSlots: TimeSlotType[];
  statuses: Record<string, AvailabilityStatus>;
  sources?: Record<string, AvailabilitySource>;
  onChange: (slot: TimeSlotType, status: AvailabilityStatus) => void;
  onBulkChange: (slots: TimeSlotType[], status: AvailabilityStatus, label: string) => void;
}) {
  const dates = useMemo(
    () => [...new Set(visibleSlots.map((slot) => slot.date))],
    [visibleSlots],
  );
  const hours = generateHours(schedule);
  const visibleKeys = useMemo(
    () => new Set(visibleSlots.map(slotKey)),
    [visibleSlots],
  );
  const [desktopPage, setDesktopPage] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus>(
    AVAILABILITY_STATUS.UNAVAILABLE,
  );

  useEffect(() => {
    setDesktopPage(0);
    setMobileIndex(0);
  }, [dates.join("|")]);

  if (!dates.length) {
    return (
      <div className="empty-state">
        <strong>表示できる候補がありません</strong>
        <p>設定した時間帯と必要時間を確認してください。</p>
      </div>
    );
  }

  const desktopDates = dates.slice(
    desktopPage * PAGE_SIZE,
    (desktopPage + 1) * PAGE_SIZE,
  );
  const currentDate = dates[Math.min(mobileIndex, dates.length - 1)];

  const slotsForDay = (date: string) =>
    visibleSlots.filter((slot) => slot.date === date);

  const renderSlot = (slot: TimeSlotType) => {
    const key = slotKey(slot);
    if (!visibleKeys.has(key)) {
      return (
        <span className="slot-empty" aria-hidden="true">
          —
        </span>
      );
    }
    return (
      <TimeSlot
        slot={slot}
        status={statuses[key] ?? AVAILABILITY_STATUS.AVAILABLE}
        selectedStatus={selectedStatus}
        source={sources[key]}
        onChange={(status) => onChange(slot, status)}
      />
    );
  };

  const selectedLabel = STATUS_META[selectedStatus].label;
  return (
    <div className="candidate-schedule-grid">
      <div className="status-picker-panel">
        <div>
          <strong>入力する状態を選ぶ</strong>
          <span>状態を選んでから、変更したい時間を押してください。</span>
        </div>
        <div className="status-picker" role="radiogroup" aria-label="入力する予定状態">
          {STATUS_OPTIONS.map(({ status, Icon }) => (
            <button
              key={status}
              type="button"
              role="radio"
              aria-checked={selectedStatus === status}
              className={`status-choice choice-${status.toLowerCase()} ${selectedStatus === status ? "selected" : ""}`}
              onClick={() => setSelectedStatus(status)}
            >
              <Icon size={17} strokeWidth={3} />
              {STATUS_META[status].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-toolbar">
        <p>
          <strong>現在の入力：{selectedLabel}</strong>
          <span>一括設定後も、個別の時間を変更できます。</span>
        </p>
        <span className="scroll-guide">
          <MoveHorizontal size={16} /> 時間帯は左右にスクロールできます
        </span>
      </div>

      <div className="desktop-schedule">
        <div className="period-controls">
          <DateNavigator
            label={`${formatDate(desktopDates[0])} 〜 ${formatDate(desktopDates[desktopDates.length - 1])}`}
            canPrevious={desktopPage > 0}
            canNext={(desktopPage + 1) * PAGE_SIZE < dates.length}
            onPrevious={() => setDesktopPage((page) => page - 1)}
            onNext={() => setDesktopPage((page) => page + 1)}
          />
          <span className="period-note">7日ずつ表示しています</span>
        </div>
        <div
          className="schedule-table-scroll"
          tabIndex={0}
          aria-label="予定入力表。左右にスクロールしてすべての時間を確認できます"
        >
          <div
            className="schedule-table"
            style={{
              gridTemplateColumns: `136px repeat(${hours.length}, minmax(74px, 1fr))`,
              minWidth: `${136 + hours.length * 74}px`,
            }}
          >
            <div className="table-corner">日付 / 時間</div>
            {hours.map((hour) => (
              <div className="time-heading" key={hour}>
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
            {desktopDates.flatMap((date) => [
              <div className="date-heading" key={`${date}-heading`}>
                <span>
                  <strong>{format(parseISO(date), "M/d", { locale: ja })}</strong>
                  <small>{format(parseISO(date), "EEEE", { locale: ja })}</small>
                </span>
                <button
                  type="button"
                  onClick={() => onBulkChange(slotsForDay(date), selectedStatus, `${formatDate(date)}を一括設定`)}
                  aria-label={`${formatDate(date)}をすべて${selectedLabel}に設定`}
                >
                  この日を一括
                </button>
              </div>,
              ...hours.map((hour) => (
                <div className="slot-cell" key={`${date}-${hour}`}>
                  {renderSlot({ date, hour })}
                </div>
              )),
            ])}
          </div>
        </div>
      </div>

      <div className="mobile-schedule">
        <DateNavigator
          label={formatDate(currentDate)}
          canPrevious={mobileIndex > 0}
          canNext={mobileIndex < dates.length - 1}
          onPrevious={() => setMobileIndex((index) => index - 1)}
          onNext={() => setMobileIndex((index) => index + 1)}
        />
        <div className="mobile-bulk-actions">
          <button
            className="bulk-button"
            type="button"
            onClick={() => onBulkChange(slotsForDay(currentDate), selectedStatus, `${formatDate(currentDate)}を一括設定`)}
          >
            <CalendarDays size={16} /> この日をすべて{selectedLabel}
          </button>
        </div>
        <div className="mobile-slot-list">
          {hours.map((hour) => {
            const slot = { date: currentDate, hour };
            if (!visibleKeys.has(slotKey(slot))) return null;
            return (
              <div className="mobile-slot-row" key={hour}>
                <span>
                  <strong>{String(hour).padStart(2, "0")}:00</strong>
                  <small>〜 {String(hour + 1).padStart(2, "0")}:00</small>
                </span>
                {renderSlot(slot)}
              </div>
            );
          })}
        </div>
        <small className="date-progress">
          {mobileIndex + 1} / {dates.length}日
        </small>
      </div>
    </div>
  );
}
