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
  description?: string;
  rating?: number;
  reviewCount?: number;
}

export interface PatientProfile extends User {
  gender?: string;
  age?: number;
  medicalHistory?: string[];
}
