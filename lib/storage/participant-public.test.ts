import { describe, expect, it } from "vitest";
import { toPublicParticipant } from "./participant-public";

describe("Participant公開情報", () => {
  it("公開BundleへeditTokenやhashを含めない", () => {
    const participant = toPublicParticipant({
      id: "participant-1",
      schedule_id: "schedule-1",
      name: "山田 太郎",
      created_at: "2026-08-20T00:00:00.000Z",
      edit_token_hash: "secret-hash",
      editToken: "raw-secret",
    } as Parameters<typeof toPublicParticipant>[0]);
    expect(participant).toEqual({
      id: "participant-1",
      scheduleId: "schedule-1",
      name: "山田 太郎",
      createdAt: "2026-08-20T00:00:00.000Z",
    });
    expect(participant).not.toHaveProperty("edit_token_hash");
    expect(participant).not.toHaveProperty("editToken");
  });
});

