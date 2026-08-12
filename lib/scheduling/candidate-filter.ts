import type { Availability } from "../../types/availability";
import type { Participant } from "../../types/participant";
import type { Schedule, TimeSlot, TimeWindow } from "../../types/schedule";
import { buildAvailabilityIndex, summarizeWindow } from "./conflict";
import { generateContinuousWindows } from "./continuous-slots";
import { generateTimeSlots, slotKey } from "./time-slots";

export type CandidateMode = "FULL_MATCH" | "MIN_CONFLICT";

export interface CandidateSelection {
  mode: CandidateMode;
  slots: TimeSlot[];
  windows: TimeWindow[];
  minConflict: number;
}

export function selectCandidates(
  schedule: Schedule,
  participants: Participant[],
  availabilities: Availability[],
): CandidateSelection {
  const allWindows = generateContinuousWindows(schedule);
  if (participants.length === 0) {
    return {
      mode: "FULL_MATCH",
      slots: generateTimeSlots(schedule),
      windows: allWindows,
      minConflict: 0,
    };
  }

  const index = buildAvailabilityIndex(availabilities);
  const summaries = allWindows.map((window) =>
    summarizeWindow(window, participants, index),
  );
  const fullMatches = summaries.filter(
    ({ unavailableCount, difficultCount }) =>
      unavailableCount === 0 && difficultCount === 0,
  );

  const selected = fullMatches.length
    ? fullMatches
    : summaries.filter(({ unavailableCount }) => {
        const minConflict = Math.min(
          ...summaries.map((summary) => summary.unavailableCount),
        );
        return unavailableCount === minConflict;
      });
  const selectedSlotKeys = new Set(
    selected.flatMap(({ window }) => window.slots.map(slotKey)),
  );

  return {
    mode: fullMatches.length ? "FULL_MATCH" : "MIN_CONFLICT",
    slots: generateTimeSlots(schedule).filter((slot) =>
      selectedSlotKeys.has(slotKey(slot)),
    ),
    windows: selected.map(({ window }) => window),
    minConflict: fullMatches.length
      ? 0
      : Math.min(...selected.map(({ unavailableCount }) => unavailableCount)),
  };
}
