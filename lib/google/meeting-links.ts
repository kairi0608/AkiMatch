const GOOGLE_TIME_ZONE = "Asia/Tokyo";
const JAPAN_UTC_OFFSET_HOURS = 9;

const GOOGLE_MEET_NEW_URL = ["https:/", "meet.new"].join("/");
const GOOGLE_CALENDAR_EVENT_BASE = [
  "https:/",
  "calendar.google.com/calendar/r/eventedit",
].join("/");

export { GOOGLE_MEET_NEW_URL };

export interface GoogleCalendarCandidateInput {
  title: string;
  date: string;
  startHour: number;
  endHour: number;
}

function toGoogleUtcTimestamp(date: string, hour: number) {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day || hour < 0 || hour > 24) {
    throw new Error("Googleカレンダー用の日時を生成できませんでした。");
  }

  // 現在のAkiMatchは日本時間として扱う
  const value = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour - JAPAN_UTC_OFFSET_HOURS,
      0,
      0,
    ),
  );

  return value
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function buildGoogleCalendarUrl({
  title,
  date,
  startHour,
  endHour,
}: GoogleCalendarCandidateInput) {
  const start = toGoogleUtcTimestamp(date, startHour);
  const end = toGoogleUtcTimestamp(date, endHour);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    stz: GOOGLE_TIME_ZONE,
    etz: GOOGLE_TIME_ZONE,
    details:
      "AkiMatchで選択した候補日時です。必要に応じてGoogleカレンダー上でGoogle Meetを追加してください。",
  });

  return `${GOOGLE_CALENDAR_EVENT_BASE}?${params.toString()}`;
}
