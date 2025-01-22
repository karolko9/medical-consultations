import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Appointment, AppointmentStatus } from '../models/appointment.model';
import { Database, ref, set, push, remove, onValue } from '@angular/fire/database';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private appointmentsSubject = new BehaviorSubject<Appointment[]>([]);

  constructor(private db: Database) {
    this.loadAppointmentsFromFirebase();
  }

  private loadAppointmentsFromFirebase(): void {
    console.log('Loading appointments from Firebase...');
    const appointmentsRef = ref(this.db, 'appointments');
    onValue(appointmentsRef, (snapshot) => {
      console.log('Raw appointments data:', snapshot.val());
      const data = snapshot.val();
      const appointments: Appointment[] = [];
      if (data) {
        Object.keys(data).forEach(key => {
          const appointment = data[key];
          appointments.push({
            ...appointment,
            id: key,
            start: new Date(appointment.start),
            end: new Date(appointment.end)
          });
        });
      }
      console.log('Processed appointments:', appointments);
      this.appointmentsSubject.next(appointments);
    });
  }

  getAppointments(): Observable<Appointment[]> {
    return this.appointmentsSubject.asObservable();
  }

  addAppointment(appointment: Appointment): Observable<Appointment> {
    console.log('Adding appointment:', appointment);
    return new Observable(subscriber => {
      const appointmentsRef = ref(this.db, 'appointments');
      const newAppointment = {
        ...appointment,
        start: appointment.start instanceof Date ? appointment.start.toISOString() : appointment.start,
        end: appointment.end instanceof Date ? appointment.end.toISOString() : appointment.end
      };
      
      console.log('Saving appointment to Firebase:', newAppointment);
      push(appointmentsRef, newAppointment)
        .then((reference) => {
          if (!reference.key) {
            throw new Error('Failed to generate appointment ID');
          }
          const savedAppointment: Appointment = {
            ...newAppointment,
            id: reference.key,
            start: new Date(newAppointment.start),
            end: new Date(newAppointment.end)
          };
          console.log('Successfully saved appointment:', savedAppointment);
          subscriber.next(savedAppointment);
          subscriber.complete();
        })
        .catch(error => {
          console.error('Error saving appointment:', error);
          subscriber.error(error);
        });
    });
  }

  updateAppointment(appointment: Appointment): Observable<Appointment> {
    return new Observable(subscriber => {
      const appointmentRef = ref(this.db, `appointments/${appointment.id}`);
      const updatedAppointment = {
        ...appointment,
        start: appointment.start instanceof Date ? appointment.start.toISOString() : appointment.start,
        end: appointment.end instanceof Date ? appointment.end.toISOString() : appointment.end
      };
      
      set(appointmentRef, updatedAppointment)
        .then(() => {
          subscriber.next(appointment);
          subscriber.complete();
        })
        .catch(error => subscriber.error(error));
    });
  }

  cancelAppointment(id: string): Observable<void> {
    return new Observable(subscriber => {
      const appointmentRef = ref(this.db, `appointments/${id}`);
      remove(appointmentRef)
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch(error => subscriber.error(error));
    });
  }

  getAppointmentsByDateRange(start: Date, end: Date): Observable<Appointment[]> {
    return new Observable(subscriber => {
      const appointments = this.appointmentsSubject.value;
      const filteredAppointments = appointments.filter(appointment => {
        const appointmentStart = appointment.start instanceof Date ? appointment.start : new Date(appointment.start);
        const appointmentEnd = appointment.end instanceof Date ? appointment.end : new Date(appointment.end);
        return appointmentStart >= start && appointmentEnd <= end;
      });
      subscriber.next(filteredAppointments);
      subscriber.complete();
    });
  }
}
