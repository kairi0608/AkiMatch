import { NextResponse } from "next/server";
import {
  deleteRemoteSchedule,
  getRemoteScheduleBundle,
  StorageConfigurationError,
} from "@/lib/storage/postgres-server";
import { isValidScheduleDeleteRequest } from "@/lib/storage/delete-validation";

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
