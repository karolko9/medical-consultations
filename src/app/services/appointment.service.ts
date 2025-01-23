import { Injectable } from '@angular/core';
import { Database, ref, push, get, remove, query, orderByChild, set, onValue } from '@angular/fire/database';
import { Observable, BehaviorSubject, from, throwError, firstValueFrom, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { Appointment, AppointmentStatus } from '../models/appointment.model';
import { CartService } from './cart.service';
import { AuthService } from './auth.service';
import { UserRole } from '../models/user.model';

export interface ExtendedAppointment extends Appointment {
  doctorId?: string;
  patientId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private appointmentsSubject = new BehaviorSubject<ExtendedAppointment[]>([]);
  private DEBUG = true;
  private readonly dbPath = 'appointments';
  private currentDoctorId: string | undefined = undefined;

  constructor(
    private db: Database, 
    private cartService: CartService,
    private authService: AuthService
  ) {
    this.initializeAppointments();
  }

  private log(...args: any[]) {
    if (this.DEBUG) {
      console.log('[AppointmentService]', ...args);
    }
  }

  private initializeAppointments() {
    this.authService.currentUser$.subscribe(user => {
      if (user && user.role === UserRole.DOCTOR) {
        this.currentDoctorId = user.uid;
        const doctorAppointmentsRef = ref(this.db, `${this.dbPath}/${user.uid}`);
        onValue(doctorAppointmentsRef, (snapshot) => {
          const data = snapshot.val();
          const appointments: ExtendedAppointment[] = [];
          if (data) {
            Object.keys(data).forEach(key => {
              const appointment = data[key];
              appointments.push({
                ...appointment,
                id: key,
                doctorId: user.uid,
                start: new Date(appointment.start),
                end: new Date(appointment.end)
              });
            });
          }
          this.appointmentsSubject.next(appointments);
        });
      } else if (user && user.role === UserRole.PATIENT) {
        // Dla pacjenta pobieramy jego wizyty ze wszystkich gabinetów
        const appointmentsRef = ref(this.db, this.dbPath);
        onValue(appointmentsRef, (snapshot) => {
          const data = snapshot.val();
          const appointments: ExtendedAppointment[] = [];
          if (data) {
            Object.keys(data).forEach(doctorId => {
              const doctorAppointments = data[doctorId];
              if (doctorAppointments) {
                Object.keys(doctorAppointments).forEach(appointmentId => {
                  const appointment = doctorAppointments[appointmentId];
                  if (appointment.patientId === user.uid) {
                    appointments.push({
                      ...appointment,
                      id: appointmentId,
                      doctorId: doctorId,
                      start: new Date(appointment.start),
                      end: new Date(appointment.end)
                    });
                  }
                });
              }
            });
          }
          this.appointmentsSubject.next(appointments);
        });
      } else {
        this.currentDoctorId = undefined;
        this.appointmentsSubject.next([]);
      }
    });
  }

  getAppointments(): Observable<ExtendedAppointment[]> {
    return this.appointmentsSubject.asObservable();
  }

  getAppointmentsByStatus(status: AppointmentStatus): Observable<ExtendedAppointment[]> {
    return this.appointmentsSubject.pipe(
      map(appointments => appointments.filter(a => a.status === status))
    );
  }

  getAppointmentsByPatient(patientId: string): Observable<ExtendedAppointment[]> {
    return this.appointmentsSubject.pipe(
      map(appointments => appointments.filter(a => a.patientId === patientId))
    );
  }

  getAppointmentsByDoctor(doctorId: string): Observable<ExtendedAppointment[]> {
    return this.appointmentsSubject.pipe(
      map(appointments => appointments.filter(a => a.doctorId === doctorId))
    );
  }

  hasTimeSlotConflict(start: Date, end: Date): Observable<boolean> {
    this.log('Sprawdzanie konfliktu terminów', {
      start: start.toISOString(),
      end: end.toISOString()
    });

    return this.appointmentsSubject.pipe(
      map(appointments => {
        const conflicts = appointments.filter(appointment => {
          if (appointment.status === AppointmentStatus.CANCELLED) {
            return false;
          }

          const appointmentStart = new Date(appointment.start);
          const appointmentEnd = new Date(appointment.end);

          const hasConflict = (
            (start >= appointmentStart && start < appointmentEnd) ||
            (end > appointmentStart && end <= appointmentEnd) ||
            (start <= appointmentStart && end >= appointmentEnd)
          );

          if (hasConflict) {
            this.log('Znaleziono konflikt z wizytą', {
              appointmentId: appointment.id,
              appointmentStart: appointmentStart.toISOString(),
              appointmentEnd: appointmentEnd.toISOString()
            });
          }

          return hasConflict;
        });

        this.log('Wynik sprawdzania konfliktów', {
          totalAppointments: appointments.length,
          conflictsFound: conflicts.length
        });

        return conflicts.length > 0;
      })
    );
  }

  addAppointment(appointment: Appointment & { doctorId?: string }): Promise<Appointment> {
    this.log('Próba dodania nowej wizyty', {
      appointment,
      doctorId: appointment.doctorId
    });

    return firstValueFrom(
      this.authService.currentUser$.pipe(
        switchMap(user => {
          if (!user) {
            this.log('Błąd: Użytkownik nie jest zalogowany');
            return throwError(() => new Error('Użytkownik nie jest zalogowany'));
          }

          if (!appointment.doctorId) {
            this.log('Błąd: Brak ID lekarza');
            return throwError(() => new Error('Wymagane jest ID lekarza'));
          }

          return from(this.hasTimeSlotConflict(new Date(appointment.start), new Date(appointment.end))).pipe(
            map(hasConflict => {
              if (hasConflict) {
                this.log('Błąd: Konflikt terminów');
                throw new Error('Wybrany termin koliduje z inną wizytą');
              }
              return appointment;
            }),
            map(appointmentToSave => {
              const extendedAppointment: ExtendedAppointment = {
                ...appointmentToSave,
                patientId: user.uid,
                status: AppointmentStatus.PENDING
              };
              this.log('Przygotowano rozszerzoną wizytę', extendedAppointment);
              return extendedAppointment;
            }),
            switchMap(extendedAppointment => {
              const appointmentsRef = ref(this.db, `${this.dbPath}/${appointment.doctorId}`);
              this.log('Zapisywanie wizyty w bazie', {
                path: `${this.dbPath}/${appointment.doctorId}`,
                appointment: extendedAppointment
              });
              return from(push(appointmentsRef, extendedAppointment));
            }),
            map(ref => {
              const savedAppointment = {
                ...appointment,
                id: ref.key!
              };
              this.log('Wizyta została zapisana', savedAppointment);
              return savedAppointment;
            })
          );
        })
      )
    );
  }

  updateAppointment(appointment: ExtendedAppointment): Promise<void> {
    if (!appointment.id || !appointment.doctorId) {
      return Promise.reject(new Error('Appointment ID and Doctor ID are required for update'));
    }

    const appointmentRef = ref(this.db, `${this.dbPath}/${appointment.doctorId}/${appointment.id}`);
    return firstValueFrom(
      from(set(appointmentRef, appointment)).pipe(
        catchError(error => {
          console.error('Error updating appointment:', error);
          return throwError(() => new Error('Failed to update appointment'));
        })
      )
    );
  }

  cancelAppointment(appointmentId: string): Observable<void> {
    return this.getAppointments().pipe(
      map(appointments => appointments.find(a => a.id === appointmentId)),
      switchMap(appointment => {
        if (!appointment || !appointment.doctorId) {
          return throwError(() => new Error('Appointment not found or missing doctor ID'));
        }
        const appointmentRef = ref(this.db, `${this.dbPath}/${appointment.doctorId}/${appointmentId}`);
        return from(remove(appointmentRef)).pipe(
          tap(() => this.cartService.removeFromCart(appointmentId))
        );
      })
    );
  }

  cancelAppointmentsInRange(startDate: Date, endDate: Date): Observable<void> {
    return this.appointmentsSubject.pipe(
      map(appointments => {
        this.log('Checking appointments in range:', {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          totalAppointments: appointments.length
        });

        return appointments.filter(appointment => {
          const appointmentStart = new Date(appointment.start);
          const appointmentEnd = new Date(appointment.end);

          const shouldCancel = (
            (appointmentStart >= startDate && appointmentStart <= endDate) ||
            (appointmentEnd >= startDate && appointmentEnd <= endDate) ||
            (appointmentStart <= startDate && appointmentEnd >= endDate)
          );

          this.log('Checking appointment:', {
            appointmentStart: appointmentStart.toISOString(),
            appointmentEnd: appointmentEnd.toISOString(),
            shouldCancel
          });

          return shouldCancel;
        });
      }),
      switchMap(appointmentsToCancel => {
        this.log('Found appointments to cancel:', appointmentsToCancel.length);
        const cancelPromises = appointmentsToCancel.map(appointment => {
          if (appointment.id && appointment.doctorId) {
            this.log('Canceling appointment:', appointment.id);
            return firstValueFrom(this.cancelAppointment(appointment.id));
          }
          return Promise.resolve();
        });
        return from(Promise.all(cancelPromises));
      }),
      map(() => void 0)
    );
  }

  removeAppointment(appointmentId: string, doctorId: string): Promise<void> {
    if (!appointmentId || !doctorId) {
      return Promise.reject(new Error('Appointment ID and Doctor ID are required for removal'));
    }

    const appointmentRef = ref(this.db, `${this.dbPath}/${doctorId}/${appointmentId}`);
    return firstValueFrom(
      from(remove(appointmentRef)).pipe(
        catchError(error => {
          console.error('Error removing appointment:', error);
          return throwError(() => new Error('Failed to remove appointment'));
        })
      )
    );
  }
}
