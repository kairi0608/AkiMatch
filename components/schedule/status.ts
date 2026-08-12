import type { AvailabilityStatus } from "@/types/availability";

export const STATUS_META: Record<AvailabilityStatus, { label: string; shortLabel: string }> = {
  AVAILABLE: { label: "空いている", shortLabel: "空き" },
  DIFFICULT: { label: "参加しづらい", shortLabel: "△ 難しい" },
  UNAVAILABLE: { label: "参加できない", shortLabel: "× 不可" },
};
