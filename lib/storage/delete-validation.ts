export function isValidScheduleDeleteRequest(
  scheduleId: unknown,
  ownerToken: unknown,
) {
  return (
    typeof scheduleId === "string" &&
    scheduleId.length >= 1 &&
    scheduleId.length <= 160 &&
    typeof ownerToken === "string" &&
    ownerToken.length >= 1 &&
    ownerToken.length <= 100
  );
}
