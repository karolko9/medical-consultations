import { Injectable } from '@angular/core';
import { Database, ref, push, onValue, query, orderByChild, equalTo } from '@angular/fire/database';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { AuthService } from './auth.service';
import { UserRole } from '../models/user.model';

export interface Notification {
  id?: string;
  userId: string;
  doctorId: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  isRead: boolean;
  appointmentId?: string;
  appointmentDate?: string;
}

export enum NotificationType {
  AVAILABILITY_CHANGED = 'AVAILABILITY_CHANGED',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
  APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER'
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private readonly dbPath = 'notifications';
  private DEBUG = true;

  constructor(
    private db: Database,
    private authService: AuthService
  ) {
    this.initializeNotifications();
  }

  private log(...args: any[]) {
    if (this.DEBUG) {
      console.log('[NotificationService]', ...args);
    }
  }

  private initializeNotifications() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.log('Inicjalizacja powiadomień dla użytkownika:', user.uid);
        let notificationsQuery;
        
        if (user.role === UserRole.PATIENT) {
          // Dla pacjenta pobierz powiadomienia, gdzie userId = uid
          notificationsQuery = query(
            ref(this.db, this.dbPath),
            orderByChild('userId'),
            equalTo(user.uid)
          );
        } else if (user.role === UserRole.DOCTOR) {
          // Dla lekarza pobierz powiadomienia, gdzie doctorId = uid
          notificationsQuery = query(
            ref(this.db, this.dbPath),
            orderByChild('doctorId'),
            equalTo(user.uid)
          );
        }

        if (notificationsQuery) {
          onValue(notificationsQuery, (snapshot) => {
            const notifications: Notification[] = [];
            snapshot.forEach((child) => {
              notifications.push({
                id: child.key,
                ...child.val()
              });
            });
            this.log('Załadowano powiadomienia:', notifications);
            this.notificationsSubject.next(notifications);
          });
        }
      }
    });
  }

  getNotifications(): Observable<Notification[]> {
    return this.notificationsSubject.asObservable();
  }

  getUnreadCount(): Observable<number> {
    return this.notificationsSubject.pipe(
      map(notifications => notifications.filter(n => !n.isRead).length)
    );
  }

  async addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) {
    this.log('Dodawanie nowego powiadomienia:', notification);
    const notificationRef = ref(this.db, this.dbPath);
    const notificationToSave = {
      ...notification,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    try {
      await push(notificationRef, notificationToSave);
      this.log('Pomyślnie dodano powiadomienie');
    } catch (error) {
      this.log('Błąd podczas dodawania powiadomienia:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string) {
    this.log('Oznaczanie powiadomienia jako przeczytane:', notificationId);
    const notificationRef = ref(this.db, `${this.dbPath}/${notificationId}`);
    try {
      await push(notificationRef, { isRead: true });
      this.log('Pomyślnie zaktualizowano status powiadomienia');
    } catch (error) {
      this.log('Błąd podczas aktualizacji statusu powiadomienia:', error);
      throw error;
    }
  }

  async notifyAvailabilityChange(doctorId: string, affectedPatients: string[]) {
    this.log('Wysyłanie powiadomień o zmianie dostępności lekarza:', doctorId);
    const notifications = affectedPatients.map(patientId => ({
      userId: patientId,
      doctorId: doctorId,
      type: NotificationType.AVAILABILITY_CHANGED,
      message: 'Twój lekarz zmienił swój harmonogram dostępności.'
    }));

    try {
      await Promise.all(notifications.map(notification => this.addNotification(notification)));
      this.log('Pomyślnie wysłano powiadomienia do wszystkich pacjentów');
    } catch (error) {
      this.log('Błąd podczas wysyłania powiadomień:', error);
      throw error;
    }
  }

  async notifyAppointmentCancelled(doctorId: string, patientId: string, appointmentId: string, appointmentDate: string) {
    this.log('Wysyłanie powiadomienia o anulowaniu wizyty:', appointmentId);
    await this.addNotification({
      userId: patientId,
      doctorId: doctorId,
      type: NotificationType.APPOINTMENT_CANCELLED,
      message: 'Twoja wizyta została anulowana przez lekarza.',
      appointmentId,
      appointmentDate
    });
  }

  async notifyAppointmentConfirmed(doctorId: string, patientId: string, appointmentId: string, appointmentDate: string) {
    this.log('Wysyłanie powiadomienia o potwierdzeniu wizyty:', appointmentId);
    await this.addNotification({
      userId: patientId,
      doctorId: doctorId,
      type: NotificationType.APPOINTMENT_CONFIRMED,
      message: 'Twoja wizyta została potwierdzona przez lekarza.',
      appointmentId,
      appointmentDate
    });
  }
} 