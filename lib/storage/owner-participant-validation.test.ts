import { describe, expect, it } from "vitest";
import {
  isValidParticipantManagementId,
  readOwnerBearerToken,
} from "./owner-participant-validation";

describe("作成者による参加者管理", () => {
  it("ownerTokenをAuthorization headerからだけ取得する", () => {
    const request = new Request("https://example.com/api", {
      headers: { Authorization: "Bearer owner-token" },
    });
    expect(readOwnerBearerToken(request)).toBe("owner-token");
    expect(readOwnerBearerToken(new Request("https://example.com/api?ownerToken=leak"))).toBeNull();
  });

  it("scheduleIdとparticipantIdの異常値を拒否する", () => {
    expect(isValidParticipantManagementId("participant-1")).toBe(true);
    expect(isValidParticipantManagementId("")).toBe(false);
    expect(isValidParticipantManagementId("x".repeat(161))).toBe(false);
  });
});

