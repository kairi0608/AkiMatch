export interface Participant {
  id: string;
  scheduleId: string;
  name: string;
  createdAt: string;
}

export interface ParticipantManagementSummary extends Participant {
  availabilityCount: number;
  canSelfManage: boolean;
}
