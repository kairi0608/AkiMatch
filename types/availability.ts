export const AVAILABILITY_STATUS = {
  AVAILABLE: "AVAILABLE",
  DIFFICULT: "DIFFICULT",
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type AvailabilityStatus =
  (typeof AVAILABILITY_STATUS)[keyof typeof AVAILABILITY_STATUS];

export const AVAILABILITY_SOURCE = {
  MANUAL: "MANUAL",
  AI: "AI",
} as const;

export type AvailabilitySource =
  (typeof AVAILABILITY_SOURCE)[keyof typeof AVAILABILITY_SOURCE];

// 変更しやすいよう、予定状態の重みはここに集約する。
export const AVAILABILITY_PENALTY: Record<AvailabilityStatus, number> = {
  AVAILABLE: 0,
  DIFFICULT: 10,
  UNAVAILABLE: 100,
};

export interface Availability {
  participantId: string;
  date: string;
  hour: number;
  status: AvailabilityStatus;
  source: AvailabilitySource;
}
