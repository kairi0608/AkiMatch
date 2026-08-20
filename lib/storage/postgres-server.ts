import "server-only";

import { neon } from "@neondatabase/serverless";
import type { Availability } from "@/types/availability";
import type { Participant } from "@/types/participant";
import type { Schedule } from "@/types/schedule";
import { toPublicParticipant } from "@/lib/storage/participant-public";

interface ScheduleRow extends Record<string, unknown> {
  id: string;
  owner_token: string;
  title: string;
  start_date: string;
  duration_days: number;
  daily_start_hour: number;
  daily_end_hour: number;
  required_duration_hours: number;
  created_at: string;
}

interface ParticipantRow extends Record<string, unknown> {
  id: string;
  schedule_id: string;
  name: string;
  created_at: string;
  edit_token_hash: string | null;
  updated_at: string;
}

interface AvailabilityRow extends Record<string, unknown> {
  participant_id: string;
  date: string;
  hour: number;
  status: Availability["status"];
  source: Availability["source"];
}

export class StorageConfigurationError extends Error {
  constructor() {
    super("共有データベースが設定されていません。");
  }
}

function database() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new StorageConfigurationError();
  return neon(connectionString);
}

const dateValue = (value: unknown) => {
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const toSchedule = (row: ScheduleRow): Schedule => ({
  id: row.id,
  title: row.title,
  startDate: dateValue(row.start_date).slice(0, 10),
  durationDays: Number(row.duration_days),
  dailyStartHour: Number(row.daily_start_hour),
  dailyEndHour: Number(row.daily_end_hour),
  requiredDurationHours: Number(row.required_duration_hours),
  createdAt: dateValue(row.created_at),
});

const toAvailability = (row: AvailabilityRow): Availability => ({
  participantId: row.participant_id,
  date: dateValue(row.date).slice(0, 10),
  hour: Number(row.hour),
  status: row.status,
  source: row.source,
});

export async function createRemoteSchedule(
  input: Omit<Schedule, "createdAt">,
  ownerToken: string,
) {
  const sql = database();
  const rows = await sql`
    insert into schedules (
      id, owner_token, title, start_date, duration_days,
      daily_start_hour, daily_end_hour, required_duration_hours
    ) values (
      ${input.id}, ${ownerToken}, ${input.title}, ${input.startDate},
      ${input.durationDays}, ${input.dailyStartHour}, ${input.dailyEndHour},
      ${input.requiredDurationHours}
    )
    returning *
  `;
  return toSchedule(rows[0] as ScheduleRow);
}

export async function listRemoteSchedules(ownerToken: string) {
  const sql = database();
  const rows = await sql`
    select * from schedules
    where owner_token = ${ownerToken}
    order by created_at desc
  `;
  return (rows as ScheduleRow[]).map(toSchedule);
}

export async function deleteRemoteSchedule(id: string, ownerToken: string) {
  const sql = database();
  const rows = await sql`
    delete from schedules
    where id = ${id} and owner_token = ${ownerToken}
    returning id
  `;
  // participants と availabilities は外部キーの on delete cascade で削除される。
  return rows.length > 0;
}

export type UpdateRemoteScheduleResult =
  | { status: "updated"; schedule: Schedule }
  | { status: "not_found" }
  | { status: "has_responses" };

export async function updateRemoteSchedule(
  id: string,
  ownerToken: string,
  input: Omit<Schedule, "id" | "createdAt">,
): Promise<UpdateRemoteScheduleResult> {
  const sql = database();
  const rows = await sql`
    update schedules as schedule
    set
      title = ${input.title},
      start_date = ${input.startDate},
      duration_days = ${input.durationDays},
      daily_start_hour = ${input.dailyStartHour},
      daily_end_hour = ${input.dailyEndHour},
      required_duration_hours = ${input.requiredDurationHours}
    where schedule.id = ${id}
      and schedule.owner_token = ${ownerToken}
      and (
        not exists (
          select 1 from participants
          where participants.schedule_id = schedule.id
        )
        or (
          schedule.start_date = ${input.startDate}
          and schedule.duration_days = ${input.durationDays}
          and schedule.daily_start_hour = ${input.dailyStartHour}
          and schedule.daily_end_hour = ${input.dailyEndHour}
          and schedule.required_duration_hours = ${input.requiredDurationHours}
        )
      )
    returning schedule.*
  `;
  if (rows[0]) {
    return { status: "updated", schedule: toSchedule(rows[0] as ScheduleRow) };
  }

  const ownedRows = await sql`
    select id from schedules
    where id = ${id} and owner_token = ${ownerToken}
    limit 1
  `;
  return ownedRows.length > 0 ? { status: "has_responses" } : { status: "not_found" };
}

export async function getRemoteScheduleBundle(id: string) {
  const sql = database();
  const [scheduleRows, participantRows, availabilityRows] = await sql.transaction(
    (tx) => [
      tx`select * from schedules where id = ${id} limit 1`,
      tx`select * from participants where schedule_id = ${id} order by created_at asc`,
      tx`
        select a.*
        from availabilities a
        inner join participants p on p.id = a.participant_id
        where p.schedule_id = ${id}
      `,
    ],
    { readOnly: true, isolationLevel: "RepeatableRead" },
  );
  if (!scheduleRows[0]) return null;
  return {
    schedule: toSchedule(scheduleRows[0] as ScheduleRow),
    participants: (participantRows as ParticipantRow[]).map(toPublicParticipant),
    availabilities: (availabilityRows as AvailabilityRow[]).map(toAvailability),
  };
}

export async function addRemoteResponse(
  scheduleId: string,
  participant: Participant,
  availabilities: Availability[],
  editTokenHash: string | null = null,
) {
  const sql = database();
  const availabilityJson = JSON.stringify(
    availabilities.map((item) => ({
      participant_id: item.participantId,
      date: item.date,
      hour: item.hour,
      status: item.status,
      source: item.source,
    })),
  );
  await sql.transaction((tx) => [
    tx`
      insert into participants (
        id, schedule_id, name, created_at, edit_token_hash, updated_at
      ) values (
        ${participant.id}, ${scheduleId}, ${participant.name}, ${participant.createdAt},
        ${editTokenHash}, ${participant.createdAt}
      )
    `,
    tx`
      insert into availabilities (participant_id, date, hour, status, source)
      select participant_id, date, hour, status, source
      from json_to_recordset(${availabilityJson}::json) as x(
        participant_id text,
        date date,
        hour integer,
        status text,
        source text
      )
    `,
  ]);
  return participant;
}

export async function getRemoteParticipantResponse(
  scheduleId: string,
  participantId: string,
  editTokenHash: string,
) {
  const sql = database();
  const [participantRows, availabilityRows] = await sql.transaction(
    (tx) => [
      tx`
        select * from participants
        where id = ${participantId}
          and schedule_id = ${scheduleId}
          and edit_token_hash = ${editTokenHash}
        limit 1
      `,
      tx`
        select a.*
        from availabilities a
        inner join participants p on p.id = a.participant_id
        where p.id = ${participantId}
          and p.schedule_id = ${scheduleId}
          and p.edit_token_hash = ${editTokenHash}
        order by a.date asc, a.hour asc
      `,
    ],
    { readOnly: true, isolationLevel: "RepeatableRead" },
  );
  if (!participantRows[0]) return null;
  return {
    participant: toPublicParticipant(participantRows[0] as ParticipantRow),
    availability: (availabilityRows as AvailabilityRow[]).map(toAvailability),
  };
}

export async function updateRemoteParticipantResponse(
  scheduleId: string,
  participant: Participant,
  editTokenHash: string,
  name: string,
  availabilities: Availability[],
) {
  const sql = database();
  const availabilityJson = JSON.stringify(
    availabilities.map((item) => ({
      participant_id: item.participantId,
      date: item.date,
      hour: item.hour,
      status: item.status,
      source: item.source,
    })),
  );
  const [updatedRows] = await sql.transaction((tx) => [
    tx`
      update participants
      set name = ${name}, updated_at = now()
      where id = ${participant.id}
        and schedule_id = ${scheduleId}
        and edit_token_hash = ${editTokenHash}
      returning *
    `,
    tx`
      delete from availabilities a
      using participants p
      where a.participant_id = p.id
        and p.id = ${participant.id}
        and p.schedule_id = ${scheduleId}
        and p.edit_token_hash = ${editTokenHash}
    `,
    tx`
      insert into availabilities (participant_id, date, hour, status, source)
      select x.participant_id, x.date, x.hour, x.status, x.source
      from json_to_recordset(${availabilityJson}::json) as x(
        participant_id text,
        date date,
        hour integer,
        status text,
        source text
      )
      inner join participants p on p.id = x.participant_id
      where p.id = ${participant.id}
        and p.schedule_id = ${scheduleId}
        and p.edit_token_hash = ${editTokenHash}
    `,
  ]);
  return updatedRows[0]
    ? toPublicParticipant(updatedRows[0] as ParticipantRow)
    : null;
}

export async function deleteRemoteParticipantResponse(
  scheduleId: string,
  participantId: string,
  editTokenHash: string,
) {
  const sql = database();
  const rows = await sql`
    delete from participants
    where id = ${participantId}
      and schedule_id = ${scheduleId}
      and edit_token_hash = ${editTokenHash}
    returning id
  `;
  return rows.length > 0;
}

export async function importRemoteBundle(
  ownerToken: string,
  schedule: Schedule,
  participants: Participant[],
  availabilities: Availability[],
) {
  const existing = await getRemoteScheduleBundle(schedule.id);
  if (existing) return existing.schedule;
  const created = await createRemoteSchedule(schedule, ownerToken);
  for (const participant of participants) {
    await addRemoteResponse(
      schedule.id,
      participant,
      availabilities.filter((item) => item.participantId === participant.id),
      null,
    );
  }
  return created;
}
