import { AVAILABILITY_STATUS, type Availability } from "../../types/availability";
import type { Participant } from "../../types/participant";
import type { Schedule, TimeWindow } from "../../types/schedule";
import {
  buildAvailabilityIndex,
  summarizeWindow,
  type ParticipantWindowStatus,
} from "./conflict";
import { generateContinuousWindows } from "./continuous-slots";

export interface RankedCandidate {
  rank: number;
  window: TimeWindow;
  score: number;
  baseScore: number;
  fairnessPenalty: number;
  availableCount: number;
  difficultCount: number;
  unavailableCount: number;
  participantStatuses: ParticipantWindowStatus[];
}

export function rankCandidates(
  schedule: Schedule,
  participants: Participant[],
  availabilities: Availability[],
  limit = Number.POSITIVE_INFINITY,
): RankedCandidate[] {
  if (participants.length === 0) return [];

  const index = buildAvailabilityIndex(availabilities);
  const pool = generateContinuousWindows(schedule).map((window) =>
    summarizeWindow(window, participants, index),
  );
  const burden = new Map<string, number>();
  const ranked: RankedCandidate[] = [];

  while (pool.length && ranked.length < limit) {
    pool.sort((a, b) => {
      const fairnessA = a.participantStatuses.reduce(
        (sum, item) =>
          sum +
          (item.status === AVAILABILITY_STATUS.AVAILABLE
            ? 0
            : (burden.get(item.participant.id) ?? 0) * 3),
        0,
      );
      const fairnessB = b.participantStatuses.reduce(
        (sum, item) =>
          sum +
          (item.status === AVAILABILITY_STATUS.AVAILABLE
            ? 0
            : (burden.get(item.participant.id) ?? 0) * 3),
        0,
      );
      return (
        a.baseScore + fairnessA - (b.baseScore + fairnessB) ||
        a.window.date.localeCompare(b.window.date) ||
        a.window.startHour - b.window.startHour
      );
    });

    const chosen = pool.shift()!;
    const fairnessPenalty = chosen.participantStatuses.reduce(
      (sum, item) =>
        sum +
        (item.status === AVAILABILITY_STATUS.AVAILABLE
          ? 0
          : (burden.get(item.participant.id) ?? 0) * 3),
      0,
    );
    for (const item of chosen.participantStatuses) {
      if (item.status !== AVAILABILITY_STATUS.AVAILABLE) {
        burden.set(item.participant.id, (burden.get(item.participant.id) ?? 0) + 1);
      }
    }
    ranked.push({
      rank: ranked.length + 1,
      ...chosen,
      score: chosen.baseScore + fairnessPenalty,
      fairnessPenalty,
    });
  }

  return ranked;
}
