export interface Schedule {
  id: string;
  title: string;
  startDate: string;
  durationDays: number;
  dailyStartHour: number;
  dailyEndHour: number;
  requiredDurationHours: number;
  createdAt: string;
}

export interface TimeSlot {
  date: string;
  hour: number;
}

export interface TimeWindow {
  date: string;
  startHour: number;
  endHour: number;
  slots: TimeSlot[];
}
