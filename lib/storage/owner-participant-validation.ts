export function readOwnerBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token.length >= 1 && token.length <= 100 ? token : null;
}

export function isValidParticipantManagementId(value: unknown) {
  return typeof value === "string" && value.length >= 1 && value.length <= 160;
}

