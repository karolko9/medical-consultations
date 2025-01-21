export interface Appointment {
  id: string;
  start: Date;
  end: Date;
  duration: number; // Duration in minutes (30, 60, 90, 120)
  title: string;
  patientName: string;
  patientGender: string;
  patientAge: number;
  consultationType: ConsultationType;
  additionalInfo?: string;
  status: AppointmentStatus;
  notes?: string;
}

export enum ConsultationType {
  FIRST_VISIT = 'First Visit',
  FOLLOW_UP = 'Follow-up',
  CONSULTATION = 'Consultation',
  PROCEDURE = 'Procedure',
  PRESCRIPTION = 'PRESCRIPTION'
}

export enum AppointmentStatus {
  SCHEDULED = 'Scheduled',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  NO_SHOW = 'No Show'
}
