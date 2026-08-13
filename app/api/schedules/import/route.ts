import { NextResponse } from "next/server";
import type { Availability } from "@/types/availability";
import type { Participant } from "@/types/participant";
import type { Schedule } from "@/types/schedule";
import {
  importRemoteBundle,
  StorageConfigurationError,
} from "@/lib/storage/postgres-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    ownerToken?: string;
    schedules?: Schedule[];
    participants?: Participant[];
    availabilities?: Availability[];
  } | null;
  if (
    !body?.ownerToken ||
    !Array.isArray(body.schedules) ||
    !Array.isArray(body.participants) ||
    !Array.isArray(body.availabilities) ||
    body.schedules.length > 100 ||
    body.participants.length > 1000 ||
    body.availabilities.length > 100000
  ) {
    return NextResponse.json({ error: "移行データを確認してください。" }, { status: 400 });
  }
  try {
    for (const schedule of body.schedules) {
      const participants = body.participants.filter(
        (item) => item.scheduleId === schedule.id,
      );
      const participantIds = new Set(participants.map((item) => item.id));
      await importRemoteBundle(
        body.ownerToken,
        schedule,
        participants,
        body.availabilities.filter((item) =>
          participantIds.has(item.participantId),
        ),
      );
    }
    return NextResponse.json({ imported: body.schedules.length });
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return NextResponse.json({ error: "共有データベースが未設定です。" }, { status: 503 });
    }
    return NextResponse.json({ error: "過去の日程を移行できませんでした。" }, { status: 500 });
  }
}
