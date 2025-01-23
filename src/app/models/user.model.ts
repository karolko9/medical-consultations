export enum UserRole {
  GUEST = 'GUEST',
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  ADMIN = 'ADMIN'
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  banned?: boolean;
  photoURL?: string;
  emailVerified?: boolean;
  lastLoginAt?: number;
  createdAt?: number;
}

export interface DoctorProfile extends User {
  specialization: string;
  education?: string;
  experience?: string;
  about?: string;
  languages?: string[];
  rating?: number;
  reviewsCount?: number;
  consultationPrice?: number;
  availableTimeSlots?: { [key: string]: boolean };
}

export interface PatientProfile extends User {
  gender?: string;
  age?: number;
  medicalHistory?: string[];
}
