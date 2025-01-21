import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { DoctorAvailability, AvailabilityType } from '../models/availability.model';
import { isWithinInterval, eachDayOfInterval } from 'date-fns';

@Injectable({
  providedIn: 'root'
})
export class AvailabilityService {
  private availabilities: DoctorAvailability[] = [];
  private availabilitiesSubject = new BehaviorSubject<DoctorAvailability[]>([]);

  constructor() {
    // Initialize with some mock recurring availability
    this.addAvailability({
      type: AvailabilityType.RECURRING,
      startDate: new Date(2025, 0, 1), // January 1, 2025
      endDate: new Date(2025, 11, 31), // December 31, 2025
      weekDays: [1, 2, 3, 4, 5], // Monday to Friday
      timeSlots: [
        { start: '08:00', end: '12:00' },
        { start: '13:00', end: '17:00' }
      ]
    });
  }

  getAvailabilities(): Observable<DoctorAvailability[]> {
    return this.availabilitiesSubject.asObservable();
  }

  addAvailability(availability: DoctorAvailability): Observable<DoctorAvailability> {
    availability.id = this.generateId();
    this.availabilities.push(availability);
    this.availabilitiesSubject.next(this.availabilities);
    return of(availability);
  }

  removeAvailability(id: string): Observable<boolean> {
    const index = this.availabilities.findIndex(a => a.id === id);
    if (index !== -1) {
      this.availabilities.splice(index, 1);
      this.availabilitiesSubject.next(this.availabilities);
      return of(true);
    }
    return of(false);
  }

  getAvailabilityForDate(date: Date): Observable<DoctorAvailability[]> {
    const dayOfWeek = date.getDay();
    
    const availableSlots = this.availabilities.filter(availability => {
      if (availability.type === AvailabilityType.ABSENCE) {
        // Check if the date falls within an absence period
        return !isWithinInterval(date, {
          start: availability.startDate,
          end: availability.endDate
        });
      }

      if (availability.type === AvailabilityType.ONE_TIME) {
        // Check if it's a one-time availability for this specific date
        return isWithinInterval(date, {
          start: availability.startDate,
          end: availability.endDate
        });
      }

      if (availability.type === AvailabilityType.RECURRING) {
        // Check if it's within the recurring availability period and matches weekday
        return (
          isWithinInterval(date, {
            start: availability.startDate,
            end: availability.endDate
          }) &&
          availability.weekDays?.includes(dayOfWeek)
        );
      }

      return false;
    });

    return of(availableSlots);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
