import type { Participant } from "@/types/participant";

export function toPublicParticipant(row: {
  id: string;
  schedule_id: string;
  name: string;
  created_at: string | Date;
}): Participant {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    name: row.name,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at),
  };
}

