export interface Appointment {
  id?: string;
  start: Date;
  end: Date;
  duration?: number; 
  title?: string;
  patientName: string;
  patientGender: string;
  patientAge: number;
  consultationType: ConsultationType;
  additionalInfo?: string;
  status: AppointmentStatus;
  notes?: string;
}

export enum ConsultationType {
  FIRST_VISIT = 'Pierwsza wizyta',
  FOLLOW_UP = 'Wizyta kontrolna',
  PRESCRIPTION = 'Recepta',
  CONSULTATION = 'Konsultacja'
}

export enum AppointmentStatus {
  PENDING = 'Oczekująca',
  CONFIRMED = 'Potwierdzona',
  CANCELLED = 'Anulowana',
  COMPLETED = 'Zakończona'
}
