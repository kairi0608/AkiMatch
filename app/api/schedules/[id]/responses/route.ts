import { NextResponse } from "next/server";
import type { Availability } from "@/types/availability";
import type { Participant } from "@/types/participant";
import {
  addRemoteResponse,
  getRemoteScheduleBundle,
  StorageConfigurationError,
} from "@/lib/storage/postgres-server";
import { validateParticipantResponse } from "@/lib/storage/response-validation";
import {
  createResponseEditToken,
  hashResponseEditToken,
} from "@/lib/security/response-token";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    availability?: Omit<Availability, "participantId">[];
  } | null;
  try {
    const bundle = await getRemoteScheduleBundle(id);
    if (!bundle) {
      return NextResponse.json({ error: "この日程調整は見つかりませんでした。" }, { status: 404 });
    }
    const validated = validateParticipantResponse(bundle.schedule, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const participant: Participant = {
      id: `participant-${crypto.randomUUID()}`,
      scheduleId: id,
      name: validated.data.name,
      createdAt: new Date().toISOString(),
    };
    const availability = validated.data.availability.map((item) => ({
      ...item,
      participantId: participant.id,
    }));
    const editToken = createResponseEditToken();
    await addRemoteResponse(
      id,
      participant,
      availability,
      hashResponseEditToken(editToken),
    );
    return NextResponse.json({ participant, editToken }, { status: 201 });
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return NextResponse.json({ error: "共有データベースが未設定です。" }, { status: 503 });
    }
    return NextResponse.json({ error: "回答を保存できませんでした。" }, { status: 500 });
  }
}
