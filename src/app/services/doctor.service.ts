import { Injectable } from '@angular/core';
import { Database, ref, query, orderByChild, equalTo, get, set } from '@angular/fire/database';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DoctorProfile, UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  constructor(private db: Database) {}

  getDoctors(): Observable<DoctorProfile[]> {
    const usersRef = ref(this.db, 'users');
    const doctorsQuery = query(usersRef, orderByChild('role'), equalTo(UserRole.DOCTOR));

    return from(get(doctorsQuery)).pipe(
      map(snapshot => {
        if (!snapshot.exists()) return [];
        
        const doctors: DoctorProfile[] = [];
        snapshot.forEach(childSnapshot => {
          const doctor = childSnapshot.val() as DoctorProfile;
          doctor.uid = childSnapshot.key!; // Dodaj uid z klucza
          doctors.push(doctor);
        });
        
        return doctors;
      }),
      catchError(error => {
        console.error('Error fetching doctors:', error);
        return of([]);
      })
    );
  }

  searchDoctors(searchTerm: string): Observable<DoctorProfile[]> {
    return this.getDoctors().pipe(
      map(doctors => {
        const term = searchTerm.toLowerCase();
        return doctors.filter(doctor => 
          doctor.displayName?.toLowerCase().includes(term) ||
          doctor.specialization?.toLowerCase().includes(term) ||
          doctor.about?.toLowerCase().includes(term) ||
          doctor.languages?.some(lang => lang.toLowerCase().includes(term))
        );
      })
    );
  }

  getDoctorById(doctorId: string): Observable<DoctorProfile | null> {
    const doctorRef = ref(this.db, `users/${doctorId}`);
    return from(get(doctorRef)).pipe(
      map(snapshot => {
        if (!snapshot.exists()) return null;
        const doctor = snapshot.val() as DoctorProfile;
        doctor.uid = snapshot.key!;
        return doctor;
      }),
      catchError(error => {
        console.error('Error fetching doctor:', error);
        return of(null);
      })
    );
  }

  async updateDoctorProfile(doctorId: string, profile: Partial<DoctorProfile>): Promise<void> {
    try {
      const doctorRef = ref(this.db, `users/${doctorId}`);
      const snapshot = await get(doctorRef);
      
      if (!snapshot.exists()) {
        throw new Error('Doctor not found');
      }

      const currentData = snapshot.val() as DoctorProfile;
      const updatedProfile = {
        ...currentData,
        ...profile,
        role: UserRole.DOCTOR // Upewnij się, że rola się nie zmieni
      };

      await set(doctorRef, updatedProfile);
    } catch (error) {
      console.error('Error updating doctor profile:', error);
      throw error;
    }
  }
}
