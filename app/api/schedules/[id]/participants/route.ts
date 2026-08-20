import { NextResponse } from "next/server";
import {
  getRemoteParticipantsForOwner,
  StorageConfigurationError,
} from "@/lib/storage/postgres-server";
import {
  isValidParticipantManagementId,
  readOwnerBearerToken,
} from "@/lib/storage/owner-participant-validation";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const ownerToken = readOwnerBearerToken(request);
  if (!ownerToken || !isValidParticipantManagementId(id)) {
    return NextResponse.json(
      { error: "日程作成者の権限を確認できませんでした。" },
      { status: 401 },
    );
  }
  try {
    const result = await getRemoteParticipantsForOwner(id, ownerToken);
    if (!result) {
      return NextResponse.json(
        { error: "管理できる日程調整が見つかりませんでした。作成した端末から操作してください。" },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return NextResponse.json({ error: "共有データベースが未設定です。" }, { status: 503 });
    }
    return NextResponse.json({ error: "参加者一覧を読み込めませんでした。" }, { status: 500 });
  }
}

