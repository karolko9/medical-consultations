import { Component, OnInit, OnDestroy } from '@angular/core';
import { 
  CalendarView, 
  CalendarEvent,
  CalendarEventTimesChangedEvent,
  CalendarEventAction,
  CalendarEventTitleFormatter,
  CalendarWeekViewBeforeRenderEvent
} from 'angular-calendar';
import { addHours, startOfDay, endOfDay, addDays, isBefore, isSameDay, addMinutes, format } from 'date-fns';
import { Subject, takeUntil } from 'rxjs';
import { AppointmentService } from '../../services/appointment.service';
import { AvailabilityService } from '../../services/availability.service';
import { Appointment, AppointmentStatus, ConsultationType } from '../../models/appointment.model';

type CalendarAppointmentEvent = CalendarEvent<Appointment>;

interface CalendarEventClickedEvent {
  event: CalendarAppointmentEvent;
  sourceEvent: MouseEvent | KeyboardEvent;
}

interface EventColors {
  primary: string;
  secondary: string;
}

@Component({
  selector: 'app-doctor-calendar',
  templateUrl: './doctor-calendar.component.html',
  styleUrls: ['./doctor-calendar.component.scss']
})
export class DoctorCalendarComponent implements OnInit, OnDestroy {
  view: CalendarView = CalendarView.Week;
  viewDate: Date = new Date();
  events: CalendarAppointmentEvent[] = [];
  CalendarView = CalendarView;
  refresh = new Subject<void>();
  private destroy$ = new Subject<void>();
  
  // Calendar display settings
  dayStartHour = 8;
  dayEndHour = 13; // 5-hour window
  hourSegments = 2; // 30-minute slots (2 segments per hour)
  hourSegmentHeight = 30; // Height of each 30-minute slot
  
  // Form control
  showAppointmentForm = false;
  selectedSlot: Date | null = null;
  availableSlots = 1;

  // Event colors based on consultation type
  private readonly consultationTypeColors: Record<ConsultationType, EventColors> = {
    [ConsultationType.FIRST_VISIT]: { primary: '#FF5733', secondary: '#FFE6E6' }, // Pomarańczowy
    [ConsultationType.FOLLOW_UP]: { primary: '#33FF57', secondary: '#E6FFE6' },   // Zielony
    [ConsultationType.CONSULTATION]: { primary: '#3357FF', secondary: '#E6E6FF' }, // Niebieski
    [ConsultationType.PROCEDURE]: { primary: '#FF33F5', secondary: '#FFE6FF' },    // Różowy
    [ConsultationType.PRESCRIPTION]: { primary: '#33FFF5', secondary: '#E6FFFF' }  // Turkusowy
  };

  // Status colors
  private readonly statusColors: Record<AppointmentStatus, EventColors> = {
    [AppointmentStatus.SCHEDULED]: { primary: '#1e90ff', secondary: '#D1E8FF' },
    [AppointmentStatus.COMPLETED]: { primary: '#00FF00', secondary: '#E6FFE6' },
    [AppointmentStatus.CANCELLED]: { primary: '#FF0000', secondary: '#FFE6E6' },
    [AppointmentStatus.NO_SHOW]: { primary: '#808080', secondary: '#D3D3D3' }
  };
  
  constructor(
    private appointmentService: AppointmentService,
    private availabilityService: AvailabilityService
  ) {}

  ngOnInit() {
    this.subscribeToAppointments();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToAppointments() {
    this.appointmentService.getAppointments()
      .pipe(takeUntil(this.destroy$))
      .subscribe(appointments => {
        this.events = appointments.map(appointment => {
          const duration = appointment.duration || 30;
          return {
            start: appointment.start,
            end: addMinutes(appointment.start, duration),
            title: appointment.title,
            color: this.getEventColor(appointment),
            meta: appointment,
            draggable: false,
            resizable: {
              beforeStart: false,
              afterEnd: false
            }
          };
        });
        this.refresh.next();
      });
  }

  getEventColor(appointment: Appointment): EventColors {
    // Past events are always gray
    if (isBefore(appointment.end, new Date())) {
      return { primary: '#808080', secondary: '#D3D3D3' };
    }

    // Cancelled or no-show appointments use status color
    if (appointment.status === AppointmentStatus.CANCELLED || 
        appointment.status === AppointmentStatus.NO_SHOW) {
      return this.statusColors[appointment.status];
    }

    // Otherwise, use consultation type color
    return this.consultationTypeColors[appointment.consultationType];
  }

  getEventTooltip(event: CalendarAppointmentEvent): string {
    const appointment = event.meta;
    if (!appointment) return '';

    const statusColors = {
      [AppointmentStatus.SCHEDULED]: '#1e90ff',
      [AppointmentStatus.COMPLETED]: '#00FF00',
      [AppointmentStatus.CANCELLED]: '#FF0000',
      [AppointmentStatus.NO_SHOW]: '#808080'
    };

    return `
      <div class="event-tooltip">
        <div class="tooltip-header" style="background-color: ${event.color?.primary}">
          <strong>${appointment.consultationType}</strong>
        </div>
        <div class="tooltip-content">
          <div class="tooltip-section">
            <strong>Patient Information</strong>
            <p>Name: ${appointment.patientName}</p>
            <p>Age: ${appointment.patientAge}</p>
            <p>Gender: ${appointment.patientGender}</p>
          </div>
          
          <div class="tooltip-section">
            <strong>Appointment Details</strong>
            <p>Date: ${format(event.start, 'dd/MM/yyyy')}</p>
            <p>Time: ${format(event.start, 'HH:mm')} - ${format(event.end!, 'HH:mm')}</p>
            <p>Duration: ${appointment.duration} minutes</p>
            <p>Status: <span style="color: ${statusColors[appointment.status]}">${appointment.status}</span></p>
          </div>
          
          ${appointment.notes ? `
          <div class="tooltip-section">
            <strong>Additional Notes</strong>
            <p>${appointment.notes}</p>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  handleEventClick(eventClickedEvent: CalendarEventClickedEvent): void {
    console.log('Event clicked:', eventClickedEvent.event);
    const appointment = eventClickedEvent.event.meta;
    if (appointment) {
      // TODO: Show appointment details or edit form
      console.log('Appointment details:', appointment);
    }
  }

  setView(view: CalendarView): void {
    this.view = view;
  }

  getAppointmentCount(date: Date): number {
    return this.events.filter(event => 
      isSameDay(event.start, date)
    ).length;
  }

  handleSlotClick({ date }: { date: Date }): void {
    if (isBefore(date, new Date())) {
      return; // Don't allow booking in the past
    }

    // Round the date to the nearest 30-minute slot
    const minutes = date.getMinutes();
    const roundedMinutes = Math.floor(minutes / 30) * 30;
    const roundedDate = new Date(date);
    roundedDate.setMinutes(roundedMinutes);
    roundedDate.setSeconds(0);
    roundedDate.setMilliseconds(0);

    // Check if slot is available
    const isSlotAvailable = !this.events.some(event => {
      const eventEnd = event.end || addMinutes(event.start, 30); // Default to 30 minutes if end is not set
      return roundedDate >= event.start && roundedDate < eventEnd;
    });

    if (isSlotAvailable) {
      this.selectedSlot = roundedDate;
      this.showAppointmentForm = true;
      // Calculate available consecutive slots
      this.calculateAvailableSlots(roundedDate);
    }
  }

  calculateAvailableSlots(startTime: Date): void {
    let availableCount = 0;
    let currentTime = startTime;
    
    while (availableCount < 6) { // Max 3 hours (6 slots of 30 minutes)
      const nextSlot = addMinutes(currentTime, 30);
      const nextSlotHour = nextSlot.getHours();
      const nextSlotMinutes = nextSlot.getMinutes();
      
      // Check if next slot is available and not past 14:00
      const isWithinHours = nextSlotHour < 14 || (nextSlotHour === 14 && nextSlotMinutes === 0);
      const isSlotAvailable = !this.events.some(event => {
        const eventEnd = event.end || addMinutes(event.start, 30);
        return currentTime >= event.start && currentTime < eventEnd;
      });

      if (!isWithinHours || !isSlotAvailable) {
        break;
      }

      availableCount++;
      currentTime = nextSlot;
    }

    this.availableSlots = availableCount;
  }

  handleAppointmentSubmit(appointmentData: Partial<Appointment>): void {
    const startTime = this.selectedSlot!;
    const duration = appointmentData.duration || 30; // Default to 30 minutes if not specified
    const endTime = addMinutes(startTime, duration);

    const appointment: Appointment = {
      id: '', // will be generated by the service
      start: startTime,
      end: endTime,
      duration: duration,
      title: `${appointmentData.consultationType} - ${appointmentData.patientName}`,
      patientName: appointmentData.patientName!,
      patientGender: appointmentData.patientGender!,
      patientAge: appointmentData.patientAge!,
      consultationType: appointmentData.consultationType!,
      status: AppointmentStatus.SCHEDULED
    };

    this.appointmentService.addAppointment(appointment).subscribe({
      next: () => {
        this.closeForm();
      },
      error: (error) => {
        console.error('Error adding appointment:', error);
        // TODO: Show error message to user
      }
    });
  }

  closeForm(): void {
    this.showAppointmentForm = false;
    this.selectedSlot = null;
  }
}
