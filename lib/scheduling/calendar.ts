import { format, getDay, parseISO } from "date-fns";

export interface CalendarMonth {
  key: string;
  label: string;
  leadingBlanks: number;
  dates: string[];
  trailingBlanks: number;
}

export function groupDatesByMonth(dates: string[]): CalendarMonth[] {
  const groups = new Map<string, string[]>();
  for (const date of dates) {
    const key = format(parseISO(date), "yyyy-MM");
    groups.set(key, [...(groups.get(key) ?? []), date]);
  }

  return [...groups.entries()].map(([key, monthDates]) => {
    const sorted = [...monthDates].sort();
    const leadingBlanks = getDay(parseISO(sorted[0]));
    const trailingBlanks = (7 - ((leadingBlanks + sorted.length) % 7)) % 7;
    return {
      key,
      label: format(parseISO(`${key}-01`), "yyyy年M月"),
      leadingBlanks,
      dates: sorted,
      trailingBlanks,
    };
  });
}
