import { addDays, format } from "date-fns";
import {
  AVAILABILITY_SOURCE,
  AVAILABILITY_STATUS,
  type Availability,
  type AvailabilityStatus,
} from "@/types/availability";
import type { Participant } from "@/types/participant";
import type { Schedule } from "@/types/schedule";
import { generateTimeSlots, slotKey } from "@/lib/scheduling/time-slots";

interface PrototypeData {
  schedules: Schedule[];
  participants: Participant[];
  availabilities: Availability[];
}

const STORAGE_KEY = "akimatch.prototype.v1";

const emptyData = (): PrototypeData => ({
  schedules: [],
  participants: [],
  availabilities: [],
});

function makeId(prefix: string) {
  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${value}`;
}

export class PrototypeScheduleRepository {
  private read(): PrototypeData {
    if (typeof window === "undefined") return emptyData();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    try {
      return JSON.parse(raw) as PrototypeData;
    } catch {
      return emptyData();
    }
  }

  private write(data: PrototypeData) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  createSchedule(input: Omit<Schedule, "id" | "createdAt">): Schedule {
    const data = this.read();
    const schedule: Schedule = {
      ...input,
      id: makeId("schedule"),
      createdAt: new Date().toISOString(),
    };
    data.schedules.push(schedule);
    this.write(data);
    return schedule;
  }

  getSchedule(id: string) {
    return this.read().schedules.find((schedule) => schedule.id === id) ?? null;
  }

  getParticipants(scheduleId: string) {
    return this.read().participants.filter(
      (participant) => participant.scheduleId === scheduleId,
    );
  }

  getAvailabilities(scheduleId: string) {
    const data = this.read();
    const participantIds = new Set(
      data.participants
        .filter((participant) => participant.scheduleId === scheduleId)
        .map((participant) => participant.id),
    );
    return data.availabilities.filter((item) =>
      participantIds.has(item.participantId),
    );
  }

  addParticipantResponse(
    scheduleId: string,
    name: string,
    availability: Omit<Availability, "participantId">[],
  ) {
    const data = this.read();
    const participant: Participant = {
      id: makeId("participant"),
      scheduleId,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    data.participants.push(participant);
    data.availabilities.push(
      ...availability.map((item) => ({ ...item, participantId: participant.id })),
    );
    this.write(data);
    return participant;
  }

  seedDemo() {
    const data = this.read();
    const schedule: Schedule = {
      id: "demo",
      title: "プロジェクトキックオフ",
      startDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      durationDays: 5,
      dailyStartHour: 9,
      dailyEndHour: 17,
      requiredDurationHours: 2,
      createdAt: new Date().toISOString(),
    };
    data.schedules = data.schedules.filter((item) => item.id !== schedule.id);
    const oldParticipantIds = new Set(
      data.participants
        .filter((item) => item.scheduleId === schedule.id)
        .map((item) => item.id),
    );
    data.participants = data.participants.filter(
      (item) => item.scheduleId !== schedule.id,
    );
    data.availabilities = data.availabilities.filter(
      (item) => !oldParticipantIds.has(item.participantId),
    );
    data.schedules.push(schedule);

    const slots = generateTimeSlots(schedule);
    const demoPeople = ["参加者A", "参加者B", "参加者C"].map(
      (name, index): Participant => ({
        id: `demo-person-${index + 1}`,
        scheduleId: schedule.id,
        name,
        createdAt: new Date(Date.now() + index * 1000).toISOString(),
      }),
    );
    data.participants.push(...demoPeople);

    const overrides: Record<string, Record<string, AvailabilityStatus>> = {
      "demo-person-1": {},
      "demo-person-2": {},
      "demo-person-3": {},
    };
    const dates = [...new Set(slots.map((slot) => slot.date))];
    const set = (
      personId: string,
      dateIndex: number,
      hours: number[],
      status: AvailabilityStatus,
    ) => {
      for (const hour of hours) {
        overrides[personId][`${dates[dateIndex]}:${hour}`] = status;
      }
    };

    set("demo-person-1", 0, [10, 11, 12, 13], AVAILABILITY_STATUS.AVAILABLE);
    set("demo-person-1", 1, [14, 15], AVAILABILITY_STATUS.AVAILABLE);
    set("demo-person-1", 2, [9, 10], AVAILABILITY_STATUS.AVAILABLE);
    set("demo-person-2", 0, [11, 12, 13], AVAILABILITY_STATUS.AVAILABLE);
    set("demo-person-2", 2, [9, 10], AVAILABILITY_STATUS.DIFFICULT);
    set("demo-person-3", 0, [10], AVAILABILITY_STATUS.AVAILABLE);
    set("demo-person-3", 1, [14, 15], AVAILABILITY_STATUS.AVAILABLE);
    set("demo-person-3", 2, [9, 10], AVAILABILITY_STATUS.AVAILABLE);

    data.availabilities.push(
      ...demoPeople.flatMap((participant) =>
        slots.map((slot): Availability => ({
          participantId: participant.id,
          date: slot.date,
          hour: slot.hour,
          status:
            overrides[participant.id][slotKey(slot)] ??
            AVAILABILITY_STATUS.UNAVAILABLE,
          source: AVAILABILITY_SOURCE.MANUAL,
        })),
      ),
    );
    this.write(data);
    return schedule;
  }
}

export const scheduleRepository = new PrototypeScheduleRepository();
