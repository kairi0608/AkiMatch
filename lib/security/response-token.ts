import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,100}$/;

export function createResponseEditToken() {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashResponseEditToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isValidResponseEditToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}

export function verifyResponseEditToken(token: string, expectedHash: string | null) {
  if (!isValidResponseEditToken(token) || !expectedHash || !/^[a-f0-9]{64}$/i.test(expectedHash)) {
    return false;
  }
  const actual = Buffer.from(hashResponseEditToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function bearerResponseEditToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  return isValidResponseEditToken(token) ? token : null;
}

