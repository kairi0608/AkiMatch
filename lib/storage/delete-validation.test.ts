import { describe, expect, it } from "vitest";
import { isValidScheduleDeleteRequest } from "./delete-validation";

describe("日程調整の削除リクエスト", () => {
  it("日程IDと所有トークンが揃った場合だけ許可する", () => {
    expect(isValidScheduleDeleteRequest("schedule-123", "owner-123")).toBe(true);
    expect(isValidScheduleDeleteRequest("schedule-123", "")).toBe(false);
    expect(isValidScheduleDeleteRequest("", "owner-123")).toBe(false);
  });

  it("異常に長い値を拒否する", () => {
    expect(isValidScheduleDeleteRequest("s".repeat(161), "owner")).toBe(false);
    expect(isValidScheduleDeleteRequest("schedule", "o".repeat(101))).toBe(false);
  });
});
