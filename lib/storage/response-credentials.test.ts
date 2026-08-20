import { describe, expect, it } from "vitest";
import {
  findResponseCredential,
  listResponseCredentials,
  readResponseTokenFragment,
  removeResponseCredential,
  responseManagementPath,
  saveResponseCredential,
} from "./response-credentials";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

const first = {
  scheduleId: "schedule-1",
  participantId: "participant-1",
  participantName: "山田 太郎",
  editToken: "a".repeat(43),
};

describe("回答管理Credential", () => {
  it("同じScheduleへ複数回答を保存できる", () => {
    const storage = memoryStorage();
    saveResponseCredential(first, storage);
    saveResponseCredential({ ...first, participantId: "participant-2", participantName: "佐藤 花子", editToken: "b".repeat(43) }, storage);
    expect(listResponseCredentials("schedule-1", storage)).toHaveLength(2);
  });

  it("同一participantは更新し、削除成功時だけ個別に除去できる", () => {
    const storage = memoryStorage();
    saveResponseCredential(first, storage);
    saveResponseCredential({ ...first, participantName: "山田 次郎" }, storage);
    expect(findResponseCredential("schedule-1", "participant-1", storage)?.participantName).toBe("山田 次郎");
    removeResponseCredential("schedule-1", "participant-1", storage);
    expect(listResponseCredentials("schedule-1", storage)).toEqual([]);
  });

  it("管理tokenをqueryではなくfragmentへ入れ、読み戻せる", () => {
    const path = responseManagementPath(first);
    expect(path).toContain("#token=");
    expect(path).not.toContain("?token=");
    expect(readResponseTokenFragment(path.slice(path.indexOf("#")))).toBe(first.editToken);
  });
});

