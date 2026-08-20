import { describe, expect, it } from "vitest";
import {
  createResponseEditToken,
  hashResponseEditToken,
  isValidResponseEditToken,
  verifyResponseEditToken,
} from "./response-token";

describe("回答編集トークン", () => {
  it("十分に長いランダムtokenを生成し、hashだけで検証できる", () => {
    const token = createResponseEditToken();
    const other = createResponseEditToken();
    const hash = hashResponseEditToken(token);
    expect(isValidResponseEditToken(token)).toBe(true);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(verifyResponseEditToken(token, hash)).toBe(true);
    expect(verifyResponseEditToken(other, hash)).toBe(false);
  });

  it("短いtokenやhashなしを拒否する", () => {
    expect(isValidResponseEditToken("short")).toBe(false);
    expect(verifyResponseEditToken("short", null)).toBe(false);
  });
});

