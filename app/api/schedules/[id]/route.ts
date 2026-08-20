import { NextResponse } from "next/server";
import {
  deleteRemoteSchedule,
  getRemoteScheduleBundle,
  StorageConfigurationError,
  updateRemoteSchedule,
} from "@/lib/storage/postgres-server";
import { isValidScheduleDeleteRequest } from "@/lib/storage/delete-validation";
import { isValidScheduleInput } from "@/lib/storage/schedule-validation";
import type { Schedule } from "@/types/schedule";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const bundle = await getRemoteScheduleBundle(id);
    if (!bundle) {
      return NextResponse.json({ error: "この日程調整は見つかりませんでした。" }, { status: 404 });
    }
    return NextResponse.json(bundle);
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return NextResponse.json({ error: "共有データベースが未設定です。" }, { status: 503 });
    }
    return NextResponse.json({ error: "日程調整を読み込めませんでした。" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    ownerToken?: string;
  } | null;
  if (!isValidScheduleDeleteRequest(id, body?.ownerToken)) {
    return NextResponse.json({ error: "削除内容を確認してください。" }, { status: 400 });
  }

  try {
    const deleted = await deleteRemoteSchedule(id, body!.ownerToken!);
    if (!deleted) {
      return NextResponse.json(
        { error: "削除できる日程調整が見つかりませんでした。" },
        { status: 404 },
      );
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return NextResponse.json({ error: "共有データベースが未設定です。" }, { status: 503 });
    }
    return NextResponse.json({ error: "日程調整を削除できませんでした。" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | (Omit<Schedule, "id" | "createdAt"> & { ownerToken?: string })
    | null;
  if (
    !isValidScheduleDeleteRequest(id, body?.ownerToken) ||
    !isValidScheduleInput(body)
  ) {
    return NextResponse.json(
      { error: "修正内容を確認してください。" },
      { status: 400 },
    );
  }

  try {
    const result = await updateRemoteSchedule(
      id,
      body!.ownerToken!,
      { ...body!, title: body!.title.trim() },
    );
    if (result.status === "not_found") {
      return NextResponse.json(
        { error: "修正できる日程調整が見つかりませんでした。作成した端末から操作してください。" },
        { status: 404 },
      );
    }
    if (result.status === "has_responses") {
      return NextResponse.json(
        { error: "すでに回答があるため、日時の条件は変更できません。タイトルのみ変更できます。" },
        { status: 409 },
      );
    }
    return NextResponse.json({ schedule: result.schedule });
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return NextResponse.json({ error: "共有データベースが未設定です。" }, { status: 503 });
    }
    return NextResponse.json({ error: "日程調整を修正できませんでした。" }, { status: 500 });
  }
}
