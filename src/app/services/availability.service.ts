import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DoctorAvailability } from '../models/availability.model';

@Injectable({
  providedIn: 'root'
})
export class AvailabilityService {
  private availabilities: DoctorAvailability[] = [];
  private nextId = 1;

  constructor() {}

  getAvailabilities(): Observable<DoctorAvailability[]> {
    return of(this.availabilities);
  }

  addAvailability(availability: DoctorAvailability): Observable<void> {
    availability.id = this.nextId.toString();
    this.nextId++;
    this.availabilities.push(availability);
    return of(void 0);
  }

  removeAvailability(id: string): Observable<void> {
    const index = this.availabilities.findIndex(a => a.id === id);
    if (index !== -1) {
      this.availabilities.splice(index, 1);
    }
    return of(void 0);
  }

  isTimeSlotAvailable(date: Date, startTime: string, endTime: string): boolean {
    const dayOfWeek = date.getDay();
    const dateString = date.toISOString().split('T')[0];

    return !this.availabilities.some(availability => {
      // Check if the date is within the availability period
      const startDate = new Date(availability.startDate);
      const endDate = new Date(availability.endDate);
      
      if (date < startDate || date > endDate) {
        return false;
      }

      // For recurring availability, check if it's the right day of the week
      if (availability.weekDays && !availability.weekDays.includes(dayOfWeek)) {
        return false;
      }

      // Check if there's any time slot conflict
      return availability.timeSlots?.some(slot => {
        const slotStart = new Date(`${dateString}T${slot.start}`);
        const slotEnd = new Date(`${dateString}T${slot.end}`);
        const checkStart = new Date(`${dateString}T${startTime}`);
        const checkEnd = new Date(`${dateString}T${endTime}`);

        return (
          (checkStart >= slotStart && checkStart < slotEnd) ||
          (checkEnd > slotStart && checkEnd <= slotEnd) ||
          (checkStart <= slotStart && checkEnd >= slotEnd)
        );
      });
    });
  }

  getDoctorAvailabilityForDay(date: Date): { start: string; end: string }[] {
    const dayOfWeek = date.getDay();
    const availableSlots: { start: string; end: string }[] = [];

    this.availabilities.forEach(availability => {
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

    return availableSlots;
  }
}
