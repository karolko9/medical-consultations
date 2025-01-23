import { Component, OnInit } from '@angular/core';
import { NotificationService, Notification, NotificationType } from '../../services/notification.service';
import { Observable } from 'rxjs';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {
  notifications$: Observable<Notification[]>;
  unreadCount$: Observable<number>;
  NotificationType = NotificationType;

  constructor(private notificationService: NotificationService) {
    this.notifications$ = this.notificationService.getNotifications();
    this.unreadCount$ = this.notificationService.getUnreadCount();
  }

  ngOnInit() {}

  async markAsRead(notification: Notification) {
    if (notification.id && !notification.isRead) {
      await this.notificationService.markAsRead(notification.id);
    }
  }

  getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.AVAILABILITY_CHANGED:
        return 'calendar-alt';
      case NotificationType.APPOINTMENT_CANCELLED:
        return 'times-circle';
      case NotificationType.APPOINTMENT_CONFIRMED:
        return 'check-circle';
      case NotificationType.APPOINTMENT_REMINDER:
        return 'bell';
      default:
        return 'info-circle';
    }
  }

  getNotificationColor(type: NotificationType): string {
    switch (type) {
      case NotificationType.AVAILABILITY_CHANGED:
        return 'text-primary';
      case NotificationType.APPOINTMENT_CANCELLED:
        return 'text-danger';
      case NotificationType.APPOINTMENT_CONFIRMED:
        return 'text-success';
      case NotificationType.APPOINTMENT_REMINDER:
        return 'text-warning';
      default:
        return 'text-info';
    }
  }

  formatDate(date: string): string {
    return format(new Date(date), 'PPp', { locale: pl });
  }
} 