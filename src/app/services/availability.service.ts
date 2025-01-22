import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DoctorAvailability } from '../models/availability.model';
import { Database, ref, set, push, remove, onValue } from '@angular/fire/database';

@Injectable({
  providedIn: 'root'
})
export class AvailabilityService {
  constructor(private db: Database) {}

  getAvailabilities(): Observable<DoctorAvailability[]> {
    return new Observable(subscriber => {
      const availabilitiesRef = ref(this.db, 'availabilities');
      onValue(availabilitiesRef, (snapshot) => {
        const data = snapshot.val();
        console.log('Raw data from Firebase:', data);
        const availabilities: DoctorAvailability[] = [];
        if (data) {
          Object.keys(data).forEach(key => {
            const item = data[key];
            // Convert dates back to proper format
            const availability: DoctorAvailability = {
              ...item,
              id: key,
              startDate: item.startDate ? item.startDate : null,
              endDate: item.endDate ? item.endDate : null
            };
            console.log('Processed availability:', availability);
            availabilities.push(availability);
          });
        }
        subscriber.next(availabilities);
      });
    });
  }

  addAvailability(availability: DoctorAvailability): Observable<any> {
    return new Observable(subscriber => {
      const availabilitiesRef = ref(this.db, 'availabilities');
      push(availabilitiesRef, availability)
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch(error => subscriber.error(error));
    });
  }

  removeAvailability(id: string): Observable<void> {
    return new Observable(subscriber => {
      const availabilityRef = ref(this.db, `availabilities/${id}`);
      remove(availabilityRef)
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch(error => subscriber.error(error));
    });
  }

  isTimeSlotAvailable(date: Date, startTime: string, endTime: string): Observable<boolean> {
    return new Observable(subscriber => {
      const availabilitiesRef = ref(this.db, 'availabilities');
      onValue(availabilitiesRef, (snapshot) => {
        const data = snapshot.val();
        const availabilities: DoctorAvailability[] = [];
        if (data) {
          Object.keys(data).forEach(key => {
            availabilities.push({ ...data[key], id: key });
          });
        }

        const dayOfWeek = date.getDay();
        const isAvailable = !availabilities.some(availability => {
          const startDate = new Date(availability.startDate);
          const endDate = new Date(availability.endDate);
          
          if (date < startDate || date > endDate) {
            return false;
          }

          if (availability.weekDays && !availability.weekDays.includes(dayOfWeek)) {
            return false;
          }

          if (availability.timeSlots) {
            return availability.timeSlots.some(slot => {
              return (
                (startTime >= slot.start && startTime < slot.end) ||
                (endTime > slot.start && endTime <= slot.end) ||
                (startTime <= slot.start && endTime >= slot.end)
              );
            });
          }

          return false;
        });

        subscriber.next(isAvailable);
      });
    });
  }

  getDoctorAvailabilityForDay(date: Date): Observable<{ start: string; end: string }[]> {
    return new Observable(subscriber => {
      const availabilitiesRef = ref(this.db, 'availabilities');
      onValue(availabilitiesRef, (snapshot) => {
        const data = snapshot.val();
        const availabilities: DoctorAvailability[] = [];
        if (data) {
          Object.keys(data).forEach(key => {
            availabilities.push({ ...data[key], id: key });
          });
        }

        const dayOfWeek = date.getDay();
        const availableSlots: { start: string; end: string }[] = [];

        availabilities.forEach(availability => {
          const startDate = new Date(availability.startDate);
          const endDate = new Date(availability.endDate);

          if (date >= startDate && date <= endDate) {
            if (
              availability.weekDays?.includes(dayOfWeek) ||
              !availability.weekDays // One-time or absence
            ) {
              availability.timeSlots?.forEach(slot => {
                availableSlots.push(slot);
              });
            }
          }
        });

        subscriber.next(availableSlots);
      });
    });
  }
}
