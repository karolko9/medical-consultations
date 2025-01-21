export interface DoctorAvailability {
  id?: string;
  type: AvailabilityType;
  startDate: Date;
  endDate: Date;
  weekDays?: number[]; // 0-6 for Sunday-Saturday
  timeSlots?: TimeSlot[];
}

export interface TimeSlot {
  start: string; // Format: "HH:mm"
  end: string;   // Format: "HH:mm"
}

export enum AvailabilityType {
  RECURRING = 'RECURRING',
  ONE_TIME = 'ONE_TIME',
  ABSENCE = 'ABSENCE'
}
