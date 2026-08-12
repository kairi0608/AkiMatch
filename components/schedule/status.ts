import { AVAILABILITY_STATUS, type AvailabilityStatus } from "@/types/availability";

export const STATUS_META: Record<AvailabilityStatus, { label: string; shortLabel: string; next: AvailabilityStatus }> = {
  AVAILABLE: { label: "空いている", shortLabel: "空き", next: AVAILABILITY_STATUS.DIFFICULT },
  DIFFICULT: { label: "参加しづらい", shortLabel: "△", next: AVAILABILITY_STATUS.UNAVAILABLE },
  UNAVAILABLE: { label: "参加できない", shortLabel: "不可", next: AVAILABILITY_STATUS.AVAILABLE },
};
