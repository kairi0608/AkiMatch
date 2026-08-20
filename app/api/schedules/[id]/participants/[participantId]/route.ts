import { NextResponse } from "next/server";
import {
  deleteRemoteParticipantAsOwner,
  StorageConfigurationError,
} from "@/lib/storage/postgres-server";
import {
  isValidParticipantManagementId,
  readOwnerBearerToken,
} from "@/lib/storage/owner-participant-validation";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; participantId: string }> },
) {
  const { id, participantId } = await context.params;
  const ownerToken = readOwnerBearerToken(request);
  if (
    !ownerToken ||
    !isValidParticipantManagementId(id) ||
    !isValidParticipantManagementId(participantId)
  ) {
    return NextResponse.json(
      { error: "日程作成者の権限を確認できませんでした。" },
      { status: 401 },
    );
  }
  try {
    const deleted = await deleteRemoteParticipantAsOwner(
      id,
      participantId,
      ownerToken,
    );
    if (!deleted) {
      return NextResponse.json(
        { error: "削除できる参加者が見つかりませんでした。" },
        { status: 404 },
      );
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return NextResponse.json({ error: "共有データベースが未設定です。" }, { status: 503 });
    }
    return NextResponse.json({ error: "参加者の回答を削除できませんでした。" }, { status: 500 });
  }
}

