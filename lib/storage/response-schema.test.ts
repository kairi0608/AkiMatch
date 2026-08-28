import { describe, expect, it } from "vitest";
import { missingResponseManagementColumns } from "./response-schema";

describe("回答管理用DB schema", () => {
  it("不足している列だけを返す", () => {
    expect(missingResponseManagementColumns([])).toEqual([
      "edit_token_hash",
      "updated_at",
    ]);
    expect(
      missingResponseManagementColumns([{ column_name: "edit_token_hash" }]),
    ).toEqual(["updated_at"]);
  });

  it("両方の列があれば不足なしと判定する", () => {
    expect(
      missingResponseManagementColumns([
        { column_name: "updated_at" },
        { column_name: "edit_token_hash" },
      ]),
    ).toEqual([]);
  });
});
