import { CalendarPlus, Video } from "lucide-react";
import type { RankedCandidate } from "@/lib/scheduling/scoring";
import {
  buildGoogleCalendarUrl,
  GOOGLE_MEET_NEW_URL,
} from "@/lib/google/meeting-links";

export function CandidateExternalActions({
  scheduleTitle,
  candidate,
}: {
  scheduleTitle: string;
  candidate: RankedCandidate;
}) {
  const calendarUrl = buildGoogleCalendarUrl({
    title: scheduleTitle,
    date: candidate.window.date,
    startHour: candidate.window.startHour,
    endHour: candidate.window.endHour,
  });

  return (
    <nav
      className="candidate-external-actions"
      aria-label="この候補日時を外部サービスで利用"
    >
      <a
        className="btn compact"
        href={GOOGLE_MEET_NEW_URL}
        target="_blank"
        rel="noreferrer"
      >
        <Video size={16} />
        Google Meetを開く
      </a>

      <a
        className="btn secondary compact"
        href={calendarUrl}
        target="_blank"
        rel="noreferrer"
      >
        <CalendarPlus size={16} />
        Googleカレンダーに追加
      </a>
    </nav>
  );
}
