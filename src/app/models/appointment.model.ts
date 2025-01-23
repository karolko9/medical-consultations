export interface Appointment {
  id?: string;
  start: Date | string;
  end: Date | string;
  title: string;
  patientName: string;
  patientGender: string;
  patientAge: number;
  consultationType: ConsultationType;
  additionalInfo?: string;
  status: AppointmentStatus;
  doctorId?: string;
}

export enum ConsultationType {
  FIRST_VISIT = 'Pierwsza wizyta',
  FOLLOW_UP = 'Wizyta kontrolna',
  CONSULTATION = 'Konsultacja',
  PRESCRIPTION = 'Recepta',
  SICK_LEAVE = 'Zwolnienie lekarskie'
}

export enum AppointmentStatus {
  PENDING = 'Oczekująca',
  CONFIRMED = 'Potwierdzona',
  CANCELLED = 'Anulowana',
  COMPLETED = 'Zakończona'
}
