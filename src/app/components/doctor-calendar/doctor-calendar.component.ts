import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarModule, CalendarView, CalendarEvent } from 'angular-calendar';
import { addHours, startOfDay, endOfDay, addDays, isBefore, isSameDay } from 'date-fns';
import { Subject } from 'rxjs';
import { AppointmentService } from '../../services/appointment.service';
import { AvailabilityService } from '../../services/availability.service';
import { Appointment, AppointmentStatus, ConsultationType } from '../../models/appointment.model';

@Component({
  selector: 'app-doctor-calendar',
  standalone: true,
  imports: [
    CommonModule,
    CalendarModule
  ],
  templateUrl: './doctor-calendar.component.html',
  styleUrls: ['./doctor-calendar.component.scss']
})
export class DoctorCalendarComponent implements OnInit {
  view: CalendarView = CalendarView.Week;
  viewDate: Date = new Date();
  events: CalendarEvent[] = [];
  CalendarView = CalendarView;
  refresh = new Subject<void>();
  
  // Calendar display settings
  dayStartHour = 8;
  dayEndHour = 14; // 6-hour window
  hourSegments = 2; // 30-minute slots
  
  constructor(
    private appointmentService: AppointmentService,
    private availabilityService: AvailabilityService
  ) {}

  ngOnInit() {
    this.loadAppointments();
  }

  loadAppointments() {
    // In a real application, this would fetch from a backend
    const mockAppointments: Appointment[] = [
      {
        id: '1',
        start: addHours(startOfDay(new Date()), 9),
        end: addHours(startOfDay(new Date()), 10),
        title: 'First Visit - John Doe',
        patientName: 'John Doe',
        patientGender: 'male',
        patientAge: 35,
        consultationType: ConsultationType.FIRST_VISIT,
        status: AppointmentStatus.SCHEDULED
      },
      {
        id: '2',
        start: addHours(addDays(startOfDay(new Date()), 1), 11),
        end: addHours(addDays(startOfDay(new Date()), 1), 12),
        title: 'Follow-up - Jane Smith',
        patientName: 'Jane Smith',
        patientGender: 'female',
        patientAge: 28,
        consultationType: ConsultationType.FOLLOW_UP,
        status: AppointmentStatus.SCHEDULED
      }
    ];

    this.events = mockAppointments.map(appointment => ({
      start: appointment.start,
      end: appointment.end,
      title: appointment.title,
      color: this.getEventColor(appointment),
      meta: appointment
    }));
  }

  getEventColor(appointment: Appointment): any {
    if (isBefore(appointment.end, new Date())) {
      return { primary: '#808080', secondary: '#D3D3D3' }; // Gray for past events
    }

    switch (appointment.status) {
      case AppointmentStatus.CANCELLED:
        return { primary: '#FF0000', secondary: '#FFE6E6' }; // Red
      case AppointmentStatus.COMPLETED:
        return { primary: '#00FF00', secondary: '#E6FFE6' }; // Green
      default:
        return { primary: '#1e90ff', secondary: '#D1E8FF' }; // Blue
    }
  }

  handleEventClick(event: CalendarEvent): void {
    console.log('Event clicked:', event);
    // Implement event click handling
  }

  setView(view: CalendarView): void {
    this.view = view;
  }

  getAppointmentCount(date: Date): number {
    return this.events.filter(event => 
      isSameDay(event.start, date)
    ).length;
  }
}
