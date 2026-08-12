"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { AVAILABILITY_STATUS, type AvailabilityStatus } from "@/types/availability";
import type { Schedule, TimeSlot as TimeSlotType } from "@/types/schedule";
import { generateHours, slotKey } from "@/lib/scheduling/time-slots";
import { DateNavigator } from "./DateNavigator";
import { ScheduleLegend } from "./ScheduleLegend";
import { TimeSlot } from "./TimeSlot";

const PAGE_SIZE = 5;
const formatDate = (date: string) => format(parseISO(date), "M月d日（E）", { locale: ja });

export function ScheduleGrid({ schedule, visibleSlots, statuses, onChange }: { schedule: Schedule; visibleSlots: TimeSlotType[]; statuses: Record<string, AvailabilityStatus>; onChange: (slot: TimeSlotType, status: AvailabilityStatus) => void }) {
  const dates = useMemo(() => [...new Set(visibleSlots.map((slot) => slot.date))], [visibleSlots]);
  const hours = generateHours(schedule);
  const visibleKeys = useMemo(() => new Set(visibleSlots.map(slotKey)), [visibleSlots]);
  const [desktopPage, setDesktopPage] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(0);

  useEffect(() => { setDesktopPage(0); setMobileIndex(0); }, [dates.join("|")]);

  if (!dates.length) return <div className="empty-state"><strong>表示できる候補がありません</strong><p>設定した時間帯と必要時間を確認してください。</p></div>;

  const desktopDates = dates.slice(desktopPage * PAGE_SIZE, (desktopPage + 1) * PAGE_SIZE);
  const currentDate = dates[Math.min(mobileIndex, dates.length - 1)];
  const renderSlot = (slot: TimeSlotType) => {
    const key = slotKey(slot);
    if (!visibleKeys.has(key)) return <span className="slot-empty" aria-hidden="true">—</span>;
    return <TimeSlot slot={slot} status={statuses[key] ?? AVAILABILITY_STATUS.AVAILABLE} onChange={(status) => onChange(slot, status)} />;
  };

  return <div className="schedule-grid-wrap">
    <div className="grid-toolbar"><p><strong>タップで予定を切り替え</strong><span>空き → 参加しづらい → 参加できない</span></p><ScheduleLegend /></div>
    <div className="desktop-schedule">
      <DateNavigator label={`${formatDate(desktopDates[0])} 〜 ${formatDate(desktopDates[desktopDates.length - 1])}`} canPrevious={desktopPage > 0} canNext={(desktopPage + 1) * PAGE_SIZE < dates.length} onPrevious={() => setDesktopPage((page) => page - 1)} onNext={() => setDesktopPage((page) => page + 1)} />
      <div className="schedule-table" style={{ gridTemplateColumns: `minmax(116px, 1.25fr) repeat(${hours.length}, minmax(68px, 1fr))` }}>
        <div className="table-corner">日付 / 時間</div>
        {hours.map((hour) => <div className="time-heading" key={hour}>{String(hour).padStart(2, "0")}:00</div>)}
        {desktopDates.flatMap((date) => [
          <div className="date-heading" key={`${date}-heading`}><strong>{format(parseISO(date), "M/d", { locale: ja })}</strong><span>{format(parseISO(date), "EEEE", { locale: ja })}</span></div>,
          ...hours.map((hour) => <div className="slot-cell" key={`${date}-${hour}`}>{renderSlot({ date, hour })}</div>),
        ])}
      </div>
    </div>
    <div className="mobile-schedule">
      <DateNavigator label={formatDate(currentDate)} canPrevious={mobileIndex > 0} canNext={mobileIndex < dates.length - 1} onPrevious={() => setMobileIndex((index) => index - 1)} onNext={() => setMobileIndex((index) => index + 1)} />
      <div className="mobile-slot-list">{hours.map((hour) => { const slot = { date: currentDate, hour }; if (!visibleKeys.has(slotKey(slot))) return null; return <div className="mobile-slot-row" key={hour}><span><strong>{String(hour).padStart(2, "0")}:00</strong><small>〜 {String(hour + 1).padStart(2, "0")}:00</small></span>{renderSlot(slot)}</div>; })}</div>
      <small className="date-progress">{mobileIndex + 1} / {dates.length}日</small>
    </div>
  </div>;
}
