import {
  AVAILABILITY_PENALTY,
  AVAILABILITY_STATUS,
  type Availability,
  type AvailabilityStatus,
} from "../../types/availability";
import type { Participant } from "../../types/participant";
import type { TimeWindow } from "../../types/schedule";
import { slotKey } from "./time-slots";

export interface ParticipantWindowStatus {
  participant: Participant;
  status: AvailabilityStatus;
}

export interface WindowSummary {
  window: TimeWindow;
  availableCount: number;
  difficultCount: number;
  unavailableCount: number;
  baseScore: number;
  participantStatuses: ParticipantWindowStatus[];
}

export function buildAvailabilityIndex(availabilities: Availability[]) {
  const index = new Map<string, AvailabilityStatus>();
  for (const item of availabilities) {
    index.set(`${item.participantId}:${slotKey(item)}`, item.status);
  }
  return index;
}

export function summarizeWindow(
  window: TimeWindow,
  participants: Participant[],
  availabilityIndex: Map<string, AvailabilityStatus>,
): WindowSummary {
  const participantStatuses = participants.map((participant) => {
    const statuses = window.slots.map(
      (slot) =>
        availabilityIndex.get(`${participant.id}:${slotKey(slot)}`) ??
        AVAILABILITY_STATUS.UNAVAILABLE,
    );
    const status = statuses.includes(AVAILABILITY_STATUS.UNAVAILABLE)
      ? AVAILABILITY_STATUS.UNAVAILABLE
      : statuses.includes(AVAILABILITY_STATUS.DIFFICULT)
        ? AVAILABILITY_STATUS.DIFFICULT
        : AVAILABILITY_STATUS.AVAILABLE;
    return { participant, status };
  });

  const availableCount = participantStatuses.filter(
    ({ status }) => status === AVAILABILITY_STATUS.AVAILABLE,
  ).length;
  const difficultCount = participantStatuses.filter(
    ({ status }) => status === AVAILABILITY_STATUS.DIFFICULT,
  ).length;
  const unavailableCount = participantStatuses.filter(
    ({ status }) => status === AVAILABILITY_STATUS.UNAVAILABLE,
  ).length;

  return {
    window,
    availableCount,
    difficultCount,
    unavailableCount,
    baseScore:
      unavailableCount * AVAILABILITY_PENALTY.UNAVAILABLE +
      difficultCount * AVAILABILITY_PENALTY.DIFFICULT,
    participantStatuses,
  };
}
