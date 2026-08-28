export const RESPONSE_MANAGEMENT_COLUMNS = [
  "edit_token_hash",
  "updated_at",
] as const;

export function missingResponseManagementColumns(
  rows: Array<{ column_name?: unknown }>,
) {
  const existing = new Set(
    rows
      .map((row) => row.column_name)
      .filter((column): column is string => typeof column === "string"),
  );
  return RESPONSE_MANAGEMENT_COLUMNS.filter((column) => !existing.has(column));
}
