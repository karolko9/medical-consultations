import { Injectable } from '@angular/core';
import { Database, ref, query, orderByChild, equalTo, get } from '@angular/fire/database';
import { Observable, from, map, catchError, of } from 'rxjs';
import { User, UserRole, DoctorProfile } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  constructor(private db: Database) {}

  private sanitizeDoctor(doctor: DoctorProfile): DoctorProfile {
    const { uid, displayName, role, photoURL } = doctor;
    return { 
      uid, 
      displayName, 
      role, 
      photoURL, 
      email: '', 
      banned: false,
      specialization: doctor.specialization || ''
    };
  }

  getDoctors(): Observable<DoctorProfile[]> {
    const doctorsRef = ref(this.db, 'users');
    const doctorsQuery = query(doctorsRef, orderByChild('role'), equalTo(UserRole.DOCTOR));

    return from(get(doctorsQuery)).pipe(
      map(snapshot => {
        const doctors: DoctorProfile[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const doctor = childSnapshot.val() as DoctorProfile;
            doctor.uid = childSnapshot.key!;
            doctors.push(this.sanitizeDoctor(doctor));
          });
        }
        return doctors;
      }),
      catchError(error => {
        console.error('Error loading doctors:', error);
        return of([]);
      })
    );
  }

  getDoctorById(doctorId: string): Observable<DoctorProfile | null> {
    const doctorRef = ref(this.db, `users/${doctorId}`);
    return from(get(doctorRef)).pipe(
      map(snapshot => {
        if (snapshot.exists()) {
          const doctor = snapshot.val() as DoctorProfile;
          doctor.uid = snapshot.key!;
          return this.sanitizeDoctor(doctor);
        }
        return null;
      }),
      catchError(error => {
        console.error('Error loading doctor:', error);
        return of(null);
      })
    );
  }

  searchDoctors(searchTerm: string): Observable<DoctorProfile[]> {
    return this.getDoctors().pipe(
      map(doctors => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return doctors.filter(doctor => 
          (doctor.displayName?.toLowerCase() || '').includes(lowerSearchTerm)
        );
      })
    );
  }
}
