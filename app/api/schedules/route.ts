import { NextResponse } from "next/server";
import type { Schedule } from "@/types/schedule";
import {
  createRemoteSchedule,
  listRemoteSchedules,
  StorageConfigurationError,
} from "@/lib/storage/postgres-server";

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

function validInput(value: unknown): value is Omit<Schedule, "id" | "createdAt"> {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.title === "string" &&
    item.title.trim().length > 0 &&
    item.title.length <= 80 &&
    typeof item.startDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.startDate) &&
    Number.isInteger(item.durationDays) &&
    Number(item.durationDays) >= 1 &&
    Number(item.durationDays) <= 60 &&
    Number.isInteger(item.dailyStartHour) &&
    Number.isInteger(item.dailyEndHour) &&
    Number(item.dailyStartHour) >= 0 &&
    Number(item.dailyEndHour) <= 24 &&
    Number(item.dailyEndHour) > Number(item.dailyStartHour) &&
    Number.isInteger(item.requiredDurationHours) &&
    Number(item.requiredDurationHours) >= 1 &&
    Number(item.requiredDurationHours) <= 8 &&
    Number(item.requiredDurationHours) <=
      Number(item.dailyEndHour) - Number(item.dailyStartHour)
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
  if (!validInput(body) || !body.ownerToken || body.ownerToken.length > 100) {
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
