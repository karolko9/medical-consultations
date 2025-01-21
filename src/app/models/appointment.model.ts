export interface Appointment {
  id?: string;
  start: Date;
  end: Date;
  title: string;
  patientName: string;
  patientGender: 'male' | 'female' | 'other';
  patientAge: number;
  consultationType: ConsultationType;
  additionalInfo?: string;
  status: AppointmentStatus;
}

export enum ConsultationType {
  FIRST_VISIT = 'FIRST_VISIT',
  FOLLOW_UP = 'FOLLOW_UP',
  PRESCRIPTION = 'PRESCRIPTION',
  CONSULTATION = 'CONSULTATION'
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}
