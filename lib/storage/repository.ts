import type { Availability } from "@/types/availability";
import type { Participant } from "@/types/participant";
import type { Schedule } from "@/types/schedule";

export interface ScheduleRepository {
  createSchedule(input: Omit<Schedule, "id" | "createdAt">): Promise<Schedule>;
  getSchedule(id: string): Schedule | null;
  getParticipants(scheduleId: string): Participant[];
  getAvailabilities(scheduleId: string): Availability[];
  addParticipantResponse(
    scheduleId: string,
    name: string,
    availability: Omit<Availability, "participantId">[],
  ): Participant;
  seedDemo(): Schedule;
}

export interface ScheduleBundle {
  schedule: Schedule;
  participants: Participant[];
  availabilities: Availability[];
}
