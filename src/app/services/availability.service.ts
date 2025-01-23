import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, map, switchMap, of } from 'rxjs';
import { DoctorAvailability, AvailabilityType } from '../models/availability.model';
import { Database, ref, set, push, remove, onValue, get, query, orderByChild } from '@angular/fire/database';
import { AuthService } from './auth.service';
import { UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AvailabilityService {
  private availabilitiesSubject = new BehaviorSubject<DoctorAvailability[]>([]);
  private readonly dbPath = 'availabilities';
  private DEBUG = true;
  private currentDoctorId: string | null = null;

  constructor(
    private db: Database,
    private authService: AuthService
  ) {
    this.initializeAvailabilities();
  }

  private log(...args: any[]) {
    if (this.DEBUG) {
      console.log('[AvailabilityService]', ...args);
    }
  }

  private initializeAvailabilities() {
    // Subscribe to auth changes to get current doctor ID
    this.authService.currentUser$.subscribe(user => {
      if (user && user.role === UserRole.DOCTOR) {
        this.currentDoctorId = user.uid;
        // Initialize availabilities for this doctor
        const doctorAvailabilitiesRef = ref(this.db, `${this.dbPath}/${user.uid}`);
        onValue(doctorAvailabilitiesRef, (snapshot) => {
          const data = snapshot.val();
          const availabilities: DoctorAvailability[] = [];
          if (data) {
            Object.keys(data).forEach(key => {
              const item = data[key];
              const availability: DoctorAvailability = {
                ...item,
                id: key,
                doctorId: user.uid,
                startDate: item.startDate ? new Date(item.startDate) : null,
                endDate: item.endDate ? new Date(item.endDate) : null
              };
              this.log('Processed availability:', availability);
              availabilities.push(availability);
            });
          }
          this.availabilitiesSubject.next(availabilities);
        });
      } else {
        this.currentDoctorId = null;
        this.availabilitiesSubject.next([]);
      }
    });
  }

  getAvailabilities(): Observable<DoctorAvailability[]> {
    return this.availabilitiesSubject.asObservable();
  }

  getAvailabilitiesByType(type: AvailabilityType): Observable<DoctorAvailability[]> {
    return this.availabilitiesSubject.pipe(
      map(availabilities => availabilities.filter(a => a.type === type))
    );
  }

  getAbsences(): Observable<DoctorAvailability[]> {
    return this.getAvailabilitiesByType(AvailabilityType.ABSENCE);
  }

  getDoctorAvailabilityForDay(date: Date): Observable<{ start: string; end: string; }[]> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user || user.role !== UserRole.DOCTOR) {
          return of([]);
        }
        
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        return this.getAvailabilities().pipe(
          map(availabilities => {
            return availabilities
              .filter(a => {
                const availabilityStart = new Date(a.startDate!);
                const availabilityEnd = new Date(a.endDate!);
                return availabilityStart <= endOfDay && availabilityEnd >= startOfDay;
              })
              .flatMap(a => a.timeSlots || []);
          })
        );
      })
    );
  }

  getDoctorAvailabilities(doctorId: string): Observable<DoctorAvailability[]> {
    const doctorAvailabilitiesRef = ref(this.db, `${this.dbPath}/${doctorId}`);
    return new Observable<DoctorAvailability[]>(subscriber => {
      onValue(doctorAvailabilitiesRef, (snapshot) => {
        const data = snapshot.val();
        const availabilities: DoctorAvailability[] = [];
        if (data) {
          Object.keys(data).forEach(key => {
            const item = data[key];
            const availability: DoctorAvailability = {
              ...item,
              id: key,
              doctorId: doctorId,
              startDate: item.startDate ? new Date(item.startDate) : null,
              endDate: item.endDate ? new Date(item.endDate) : null
            };
            availabilities.push(availability);
          });
        }
        subscriber.next(availabilities);
      });
    });
  }

  addAvailability(availability: DoctorAvailability): Observable<string> {
    if (!this.currentDoctorId) {
      return new Observable(subscriber => 
        subscriber.error(new Error('No doctor is currently logged in'))
      );
    }

    return new Observable(subscriber => {
      const doctorAvailabilitiesRef = ref(this.db, `${this.dbPath}/${this.currentDoctorId}`);
      const availabilityToSave = {
        ...availability,
        doctorId: this.currentDoctorId,
        startDate: availability.startDate instanceof Date ? availability.startDate.toISOString() : availability.startDate,
        endDate: availability.endDate instanceof Date ? availability.endDate.toISOString() : availability.endDate
      };

      push(doctorAvailabilitiesRef, availabilityToSave)
        .then((ref) => {
          if (ref.key) {
            subscriber.next(ref.key);
            subscriber.complete();
          } else {
            subscriber.error(new Error('Failed to get reference key'));
          }
        })
        .catch(error => subscriber.error(error));
    });
  }

  updateAvailability(availability: DoctorAvailability): Observable<void> {
    if (!this.currentDoctorId) {
      return new Observable(subscriber => 
        subscriber.error(new Error('No doctor is currently logged in'))
      );
    }

    return new Observable(subscriber => {
      if (!availability.id) {
        subscriber.error(new Error('Availability ID is required for update'));
        return;
      }

      const availabilityRef = ref(this.db, `${this.dbPath}/${this.currentDoctorId}/${availability.id}`);
      const availabilityToSave = {
        ...availability,
        doctorId: this.currentDoctorId,
        startDate: availability.startDate instanceof Date ? availability.startDate.toISOString() : availability.startDate,
        endDate: availability.endDate instanceof Date ? availability.endDate.toISOString() : availability.endDate
      };

      set(availabilityRef, availabilityToSave)
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch(error => subscriber.error(error));
    });
  }

  removeAvailability(availabilityId: string): Observable<void> {
    if (!this.currentDoctorId) {
      return new Observable(subscriber => 
        subscriber.error(new Error('No doctor is currently logged in'))
      );
    }

    return new Observable(subscriber => {
      const availabilityRef = ref(this.db, `${this.dbPath}/${this.currentDoctorId}/${availabilityId}`);
      remove(availabilityRef)
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch(error => subscriber.error(error));
    });
  }
}
