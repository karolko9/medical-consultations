import { Injectable } from '@angular/core';
import { Database, ref, push, get, remove, query, orderByChild, set, onValue } from '@angular/fire/database';
import { Observable, BehaviorSubject } from 'rxjs';
import { Appointment, AppointmentStatus } from '../models/appointment.model';
import { CartService } from './cart.service';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
  private DEBUG = true;
  private readonly dbPath = 'appointments';

  constructor(private db: Database, private cartService: CartService) {
    this.initializeAppointments();
  }

  private log(...args: any[]) {
    if (this.DEBUG) {
      console.log('[AppointmentService]', ...args);
    }
  }

  private initializeAppointments() {
    const appointmentsRef = ref(this.db, this.dbPath);
    onValue(appointmentsRef, (snapshot) => {
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
      this.appointmentsSubject.next(appointments);
    });
  }

  getAppointments(): Observable<Appointment[]> {
    return this.appointmentsSubject.asObservable();
  }

  async addAppointment(appointment: Appointment): Promise<Appointment> {
    const startDate = new Date(appointment.start);
    const endDate = new Date(appointment.end);
    
    const hasConflict = await this.hasTimeSlotConflict(startDate, endDate);
    if (hasConflict) {
      throw new Error('Wybrany termin koliduje z inną wizytą');
    }

    const appointmentsRef = ref(this.db, this.dbPath);
    const appointmentToSave = {
      ...appointment,
      start: startDate.toISOString(),
      end: endDate.toISOString()
    };

    const newAppointmentRef = await push(appointmentsRef);
    if (!newAppointmentRef.key) {
      throw new Error('Nie udało się utworzyć nowej wizyty');
    }

    const newAppointment = { ...appointmentToSave, id: newAppointmentRef.key };
    await set(newAppointmentRef, newAppointment);
    
    return {
      ...newAppointment,
      start: startDate,
      end: endDate
    };
  }

  updateAppointment(appointment: Appointment): Observable<Appointment> {
    return new Observable(subscriber => {
      const appointmentRef = ref(this.db, `${this.dbPath}/${appointment.id}`);
      const appointmentToSave = {
        ...appointment,
        start: new Date(appointment.start).toISOString(),
        end: new Date(appointment.end).toISOString()
      };

      set(appointmentRef, appointmentToSave)
        .then(() => {
          subscriber.next(appointment);
          subscriber.complete();
        })
        .catch(error => subscriber.error(error));
    });
  }

  cancelAppointment(id: string): Observable<void> {
    return new Observable(subscriber => {
      const appointmentRef = ref(this.db, `${this.dbPath}/${id}`);
      remove(appointmentRef)
        .then(() => {
          this.cartService.removeFromCart(id);
          subscriber.next();
          subscriber.complete();
        })
        .catch(error => subscriber.error(error));
    });
  }

  async hasTimeSlotConflict(start: Date, end: Date): Promise<boolean> {
    const appointments = await this.getAppointmentsSnapshot();
    
    return appointments.some(appointment => {
      if (appointment.status === AppointmentStatus.CANCELLED) {
        return false;
      }

      const appointmentStart = new Date(appointment.start);
      const appointmentEnd = new Date(appointment.end);

      return (
        (start >= appointmentStart && start < appointmentEnd) ||
        (end > appointmentStart && end <= appointmentEnd) ||
        (start <= appointmentStart && end >= appointmentEnd)
      );
    });
  }

  private async getAppointmentsSnapshot(): Promise<Appointment[]> {
    const appointmentsRef = ref(this.db, this.dbPath);
    const snapshot = await get(appointmentsRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const appointments: Appointment[] = [];
    snapshot.forEach((child) => {
      const appointment = child.val();
      if (child.key) {
        appointments.push({
          ...appointment,
          id: child.key,
          start: new Date(appointment.start),
          end: new Date(appointment.end)
        });
      }
    });

    return appointments;
  }

  async cancelAppointmentsInRange(startDate: Date, endDate: Date): Promise<void> {
    const appointments = await this.getAppointmentsSnapshot();
    
    this.log('Checking appointments in range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalAppointments: appointments.length
    });

    const appointmentsToCancel = appointments.filter(appointment => {
      const appointmentStart = new Date(appointment.start);
      const appointmentEnd = new Date(appointment.end);

      const shouldCancel = (
        (appointmentStart >= startDate && appointmentStart <= endDate) || // wizyta zaczyna się w okresie nieobecności
        (appointmentEnd >= startDate && appointmentEnd <= endDate) || // wizyta kończy się w okresie nieobecności
        (appointmentStart <= startDate && appointmentEnd >= endDate) // wizyta obejmuje cały okres nieobecności
      );

      this.log('Checking appointment:', {
        appointmentStart: appointmentStart.toISOString(),
        appointmentEnd: appointmentEnd.toISOString(),
        shouldCancel
      });

      return shouldCancel;
    });

    this.log('Found appointments to cancel:', appointmentsToCancel.length);

    for (const appointment of appointmentsToCancel) {
      if (appointment.id) {
        this.log('Canceling appointment:', appointment.id);
        await this.cancelAppointment(appointment.id).toPromise();
      }
    }
  }
}
