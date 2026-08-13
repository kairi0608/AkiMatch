import { addDays, isWithinInterval, parseISO } from "date-fns";
import { NextResponse } from "next/server";
import {
  AVAILABILITY_SOURCE,
  AVAILABILITY_STATUS,
  type Availability,
} from "@/types/availability";
import type { Participant } from "@/types/participant";
import {
  addRemoteResponse,
  getRemoteScheduleBundle,
  StorageConfigurationError,
} from "@/lib/storage/postgres-server";

export const dynamic = "force-dynamic";

const statuses = new Set(Object.values(AVAILABILITY_STATUS));
const sources = new Set(Object.values(AVAILABILITY_SOURCE));

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    availability?: Omit<Availability, "participantId">[];
  } | null;
  if (
    !body?.name?.trim() ||
    body.name.length > 40 ||
    !Array.isArray(body.availability) ||
    body.availability.length === 0 ||
    body.availability.length > 1500
  ) {
    return NextResponse.json({ error: "回答内容を確認してください。" }, { status: 400 });
  }
  try {
    const bundle = await getRemoteScheduleBundle(id);
    if (!bundle) {
      return NextResponse.json({ error: "この日程調整は見つかりませんでした。" }, { status: 404 });
    }
    const start = parseISO(bundle.schedule.startDate);
    const end = addDays(start, bundle.schedule.durationDays - 1);
    const unique = new Set<string>();
    const valid = body.availability.every((item) => {
      const key = `${item.date}:${item.hour}`;
      if (unique.has(key)) return false;
      unique.add(key);
      return (
        /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
        isWithinInterval(parseISO(item.date), { start, end }) &&
        Number.isInteger(item.hour) &&
        item.hour >= bundle.schedule.dailyStartHour &&
        item.hour < bundle.schedule.dailyEndHour &&
        statuses.has(item.status) &&
        sources.has(item.source)
      );
    });
    if (!valid) {
      return NextResponse.json({ error: "回答範囲に不正な時間が含まれています。" }, { status: 400 });
    }
    const participant: Participant = {
      id: `participant-${crypto.randomUUID()}`,
      scheduleId: id,
      name: body.name.trim(),
      createdAt: new Date().toISOString(),
    };
    const availability = body.availability.map((item) => ({
      ...item,
      participantId: participant.id,
    }));
    await addRemoteResponse(id, participant, availability);
    return NextResponse.json({ participant }, { status: 201 });
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return NextResponse.json({ error: "共有データベースが未設定です。" }, { status: 503 });
    }
    return NextResponse.json({ error: "回答を保存できませんでした。" }, { status: 500 });
  }
}
