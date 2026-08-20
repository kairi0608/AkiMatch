import { NextResponse } from "next/server";
import type { Schedule } from "@/types/schedule";
import {
  createRemoteSchedule,
  listRemoteSchedules,
  StorageConfigurationError,
} from "@/lib/storage/postgres-server";
import { isValidScheduleInput } from "@/lib/storage/schedule-validation";

export const dynamic = "force-dynamic";

function failure(error: unknown) {
  if (error instanceof StorageConfigurationError) {
    return NextResponse.json(
      { error: "共有データベースが未設定です。Vercelの環境変数を設定してください。" },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { error: "共有データベースへの接続に失敗しました。" },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  const ownerToken = new URL(request.url).searchParams.get("ownerToken");
  if (!ownerToken || ownerToken.length > 100) {
    return NextResponse.json({ error: "一覧を読み込めません。" }, { status: 400 });
  }
  try {
    const schedules = await listRemoteSchedules(ownerToken);
    return NextResponse.json({ schedules });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | (Omit<Schedule, "id" | "createdAt"> & { ownerToken?: string })
    | null;
  if (!isValidScheduleInput(body) || !body.ownerToken || body.ownerToken.length > 100) {
    return NextResponse.json({ error: "日程調整の設定内容を確認してください。" }, { status: 400 });
  }
  try {
    const schedule = await createRemoteSchedule(
      { ...body, title: body.title.trim(), id: `schedule-${crypto.randomUUID()}` },
      body.ownerToken,
    );
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
