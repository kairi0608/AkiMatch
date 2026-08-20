import { NextResponse } from "next/server";
import type { Availability } from "@/types/availability";
import {
  deleteRemoteParticipantResponse,
  getRemoteParticipantResponse,
  getRemoteScheduleBundle,
  StorageConfigurationError,
  updateRemoteParticipantResponse,
} from "@/lib/storage/postgres-server";
import { validateParticipantResponse } from "@/lib/storage/response-validation";
import {
  bearerResponseEditToken,
  hashResponseEditToken,
} from "@/lib/security/response-token";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; participantId: string }>;
};

function unauthorized() {
  return NextResponse.json(
    { error: "回答を管理するための認証情報がありません。" },
    { status: 401 },
  );
}

function forbidden() {
  return NextResponse.json(
    { error: "この回答を修正する権限を確認できませんでした。" },
    { status: 403 },
  );
}

function failure(error: unknown, action: string) {
  if (error instanceof StorageConfigurationError) {
    return NextResponse.json({ error: "共有データベースが未設定です。" }, { status: 503 });
  }
  return NextResponse.json({ error: `回答を${action}できませんでした。` }, { status: 500 });
}

export async function GET(request: Request, context: RouteContext) {
  const token = bearerResponseEditToken(request);
  if (!token) return unauthorized();
  const { id, participantId } = await context.params;
  try {
    const response = await getRemoteParticipantResponse(
      id,
      participantId,
      hashResponseEditToken(token),
    );
    return response ? NextResponse.json(response) : forbidden();
  } catch (error) {
    return failure(error, "読み込み");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const token = bearerResponseEditToken(request);
  if (!token) return unauthorized();
  const { id, participantId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    availability?: Omit<Availability, "participantId">[];
  } | null;
  const editTokenHash = hashResponseEditToken(token);

  try {
    const current = await getRemoteParticipantResponse(id, participantId, editTokenHash);
    if (!current) return forbidden();
    const bundle = await getRemoteScheduleBundle(id);
    if (!bundle) {
      return NextResponse.json({ error: "この日程調整は見つかりませんでした。" }, { status: 404 });
    }
    const validated = validateParticipantResponse(bundle.schedule, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const availability = validated.data.availability.map((item) => ({
      ...item,
      participantId,
    }));
    const participant = await updateRemoteParticipantResponse(
      id,
      current.participant,
      editTokenHash,
      validated.data.name,
      availability,
    );
    if (!participant) return forbidden();
    return NextResponse.json({ participant, availability });
  } catch (error) {
    return failure(error, "更新");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const token = bearerResponseEditToken(request);
  if (!token) return unauthorized();
  const { id, participantId } = await context.params;
  try {
    const deleted = await deleteRemoteParticipantResponse(
      id,
      participantId,
      hashResponseEditToken(token),
    );
    return deleted ? NextResponse.json({ deleted: true }) : forbidden();
  } catch (error) {
    return failure(error, "削除");
  }
}
