"use client";

import { addDays, format } from "date-fns";
import {
  AVAILABILITY_SOURCE,
  AVAILABILITY_STATUS,
  type AvailabilityStatus,
} from "@/types/availability";
import type { Availability } from "@/types/availability";
import type { Participant } from "@/types/participant";
import type { Schedule } from "@/types/schedule";
import type { ScheduleBundle } from "./repository";
import { generateTimeSlots, slotKey } from "@/lib/scheduling/time-slots";

const OWNER_TOKEN_KEY = "akimatch.owner-token.v1";
const LEGACY_STORAGE_KEY = "akimatch.prototype.v1";
const MIGRATED_KEY = "akimatch.legacy-migrated.v1";

interface LegacyData {
  schedules: Schedule[];
  participants: Participant[];
  availabilities: Availability[];
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function ownerToken() {
  let token = window.localStorage.getItem(OWNER_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem(OWNER_TOKEN_KEY, token);
  }
  return token;
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;
  if (!response.ok) {
    throw new RepositoryError(
      body.error ?? "データの保存または読み込みに失敗しました。",
      response.status,
    );
  }
  return body;
}

function readLegacy(): LegacyData | null {
  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LegacyData;
  } catch {
    return null;
  }
}

export const scheduleRepository = {
  async createSchedule(
    input: Omit<Schedule, "id" | "createdAt">,
  ): Promise<Schedule> {
    const result = await json<{ schedule: Schedule }>("/api/schedules", {
      method: "POST",
      body: JSON.stringify({ ...input, ownerToken: ownerToken() }),
    });
    return result.schedule;
  },

  async getBundle(scheduleId: string): Promise<ScheduleBundle | null> {
    try {
      return await json<ScheduleBundle>(
        `/api/schedules/${encodeURIComponent(scheduleId)}`,
      );
    } catch (error) {
      if (!(error instanceof RepositoryError) || error.status !== 404) throw error;
      const legacy = readLegacy();
      const schedule = legacy?.schedules.find((item) => item.id === scheduleId);
      if (!legacy || !schedule) return null;
      const participants = legacy.participants.filter(
        (item) => item.scheduleId === scheduleId,
      );
      const ids = new Set(participants.map((item) => item.id));
      return {
        schedule,
        participants,
        availabilities: legacy.availabilities.filter((item) =>
          ids.has(item.participantId),
        ),
      };
    }
  },

  async listSchedules(): Promise<Schedule[]> {
    await this.migrateLegacy();
    const result = await json<{ schedules: Schedule[] }>(
      `/api/schedules?ownerToken=${encodeURIComponent(ownerToken())}`,
    );
    return result.schedules;
  },

  async addParticipantResponse(
    scheduleId: string,
    name: string,
    availability: Omit<Availability, "participantId">[],
  ) {
    const result = await json<{ participant: Participant }>(
      `/api/schedules/${encodeURIComponent(scheduleId)}/responses`,
      {
        method: "POST",
        body: JSON.stringify({ name, availability }),
      },
    );
    return result.participant;
  },

  async migrateLegacy() {
    if (window.localStorage.getItem(MIGRATED_KEY)) return;
    const legacy = readLegacy();
    if (!legacy?.schedules.length) {
      window.localStorage.setItem(MIGRATED_KEY, "1");
      return;
    }
    await json<{ imported: number }>("/api/schedules/import", {
      method: "POST",
      body: JSON.stringify({ ...legacy, ownerToken: ownerToken() }),
    });
    window.localStorage.setItem(MIGRATED_KEY, "1");
  },

  async seedDemo() {
    const schedule = await this.createSchedule({
      title: "プロジェクトキックオフ",
      startDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      durationDays: 5,
      dailyStartHour: 9,
      dailyEndHour: 17,
      requiredDurationHours: 2,
    });
    const slots = generateTimeSlots(schedule);
    const dates = [...new Set(slots.map((slot) => slot.date))];
    const people = ["参加者A", "参加者B", "参加者C"];
    const availableByPerson: Record<string, Record<string, AvailabilityStatus>> = {
      参加者A: {},
      参加者B: {},
      参加者C: {},
    };
    const set = (
      name: string,
      dateIndex: number,
      hours: number[],
      status: AvailabilityStatus,
    ) => {
      for (const hour of hours) {
        availableByPerson[name][`${dates[dateIndex]}:${hour}`] = status;
      }
    };
    set("参加者A", 0, [10, 11, 12, 13], AVAILABILITY_STATUS.AVAILABLE);
    set("参加者A", 1, [14, 15], AVAILABILITY_STATUS.AVAILABLE);
    set("参加者A", 2, [9, 10], AVAILABILITY_STATUS.AVAILABLE);
    set("参加者B", 0, [11, 12, 13], AVAILABILITY_STATUS.AVAILABLE);
    set("参加者B", 2, [9, 10], AVAILABILITY_STATUS.DIFFICULT);
    set("参加者C", 0, [10], AVAILABILITY_STATUS.AVAILABLE);
    set("参加者C", 1, [14, 15], AVAILABILITY_STATUS.AVAILABLE);
    set("参加者C", 2, [9, 10], AVAILABILITY_STATUS.AVAILABLE);

    for (const name of people) {
      await this.addParticipantResponse(
        schedule.id,
        name,
        slots.map((slot) => ({
          ...slot,
          status:
            availableByPerson[name][slotKey(slot)] ??
            AVAILABILITY_STATUS.UNAVAILABLE,
          source: AVAILABILITY_SOURCE.MANUAL,
        })),
      );
    }
    return schedule;
  },
};
