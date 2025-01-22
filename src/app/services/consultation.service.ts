import { Injectable } from '@angular/core';
import { Database, ref, set, push, remove, onValue } from '@angular/fire/database';
import { Observable } from 'rxjs';

export interface Consultation {
  id?: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  patientName: string;
  patientGender: string;
  patientAge: number;
  notes: string;
  status: 'scheduled' | 'cancelled' | 'completed';
}

export interface DoctorAvailability {
  id?: string;
  startDate: string;
  endDate: string;
  weekDays: number[];  // 0-6 representing Sunday-Saturday
  timeSlots: {
    start: string;
    end: string;
  }[];
}

export interface DoctorAbsence {
  id?: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConsultationService {
  constructor(private db: Database) {}

  getConsultations(): Observable<Consultation[]> {
    return new Observable(subscriber => {
      const consultationsRef = ref(this.db, 'consultations');
      onValue(consultationsRef, (snapshot) => {
        const data = snapshot.val();
        const consultations: Consultation[] = [];
        if (data) {
          Object.keys(data).forEach(key => {
            consultations.push({ ...data[key], id: key });
          });
        }
        subscriber.next(consultations);
      });
    });
  }

  addConsultation(consultation: Consultation) {
    const consultationsRef = ref(this.db, 'consultations');
    return push(consultationsRef, consultation);
  }

  updateConsultation(id: string, consultation: Partial<Consultation>) {
    const consultationRef = ref(this.db, `consultations/${id}`);
    return set(consultationRef, consultation);
  }

  cancelConsultation(id: string) {
    const consultationRef = ref(this.db, `consultations/${id}`);
    return set(consultationRef, { status: 'cancelled' });
  }

  getDoctorAvailability(): Observable<DoctorAvailability[]> {
    return new Observable(subscriber => {
      const availabilityRef = ref(this.db, 'availability');
      onValue(availabilityRef, (snapshot) => {
        const data = snapshot.val();
        const availabilities: DoctorAvailability[] = [];
        if (data) {
          Object.keys(data).forEach(key => {
            availabilities.push({ ...data[key], id: key });
          });
        }
        subscriber.next(availabilities);
      });
    });
  }

  addDoctorAvailability(availability: DoctorAvailability) {
    const availabilityRef = ref(this.db, 'availability');
    return push(availabilityRef, availability);
  }

  updateDoctorAvailability(id: string, availability: Partial<DoctorAvailability>) {
    const availabilityRef = ref(this.db, `availability/${id}`);
    return set(availabilityRef, availability);
  }

  getDoctorAbsences(): Observable<DoctorAbsence[]> {
    return new Observable(subscriber => {
      const absencesRef = ref(this.db, 'absences');
      onValue(absencesRef, (snapshot) => {
        const data = snapshot.val();
        const absences: DoctorAbsence[] = [];
        if (data) {
          Object.keys(data).forEach(key => {
            absences.push({ ...data[key], id: key });
          });
        }
        subscriber.next(absences);
      });
    });
  }

  addDoctorAbsence(absence: DoctorAbsence) {
    const absencesRef = ref(this.db, 'absences');
    return push(absencesRef, absence);
  }

  updateDoctorAbsence(id: string, absence: Partial<DoctorAbsence>) {
    const absenceRef = ref(this.db, `absences/${id}`);
    return set(absenceRef, absence);
  }

  removeDoctorAbsence(id: string) {
    const absenceRef = ref(this.db, `absences/${id}`);
    return remove(absenceRef);
  }
}
