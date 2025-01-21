import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { Appointment, AppointmentStatus } from '../models/appointment.model';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private appointments: Appointment[] = [];
  private appointmentsSubject = new BehaviorSubject<Appointment[]>([]);

  constructor() {
    // Initialize with mock data in memory
    // In a real application, this would be fetched from a backend
  }

  getAppointments(): Observable<Appointment[]> {
    return this.appointmentsSubject.asObservable();
  }

  addAppointment(appointment: Appointment): Observable<Appointment> {
    appointment.id = this.generateId();
    this.appointments.push(appointment);
    this.appointmentsSubject.next(this.appointments);
    return of(appointment);
  }

  updateAppointment(appointment: Appointment): Observable<Appointment> {
    const index = this.appointments.findIndex(a => a.id === appointment.id);
    if (index !== -1) {
      this.appointments[index] = appointment;
      this.appointmentsSubject.next(this.appointments);
      return of(appointment);
    }
    throw new Error('Appointment not found');
  }

  cancelAppointment(id: string): Observable<Appointment> {
    const appointment = this.appointments.find(a => a.id === id);
    if (appointment) {
      appointment.status = AppointmentStatus.CANCELLED;
      this.appointmentsSubject.next(this.appointments);
      return of(appointment);
    }
    throw new Error('Appointment not found');
  }

  getAppointmentsByDateRange(start: Date, end: Date): Observable<Appointment[]> {
    const filteredAppointments = this.appointments.filter(appointment => 
      appointment.start >= start && appointment.end <= end
    );
    return of(filteredAppointments);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
