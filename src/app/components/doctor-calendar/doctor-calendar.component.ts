import { Component, OnInit, OnDestroy } from '@angular/core';
import { 
  CalendarView, 
  CalendarEvent,
  CalendarEventTimesChangedEvent,
  CalendarWeekViewBeforeRenderEvent
} from 'angular-calendar';
import { addHours, startOfDay, endOfDay, addDays, isBefore, isSameDay, addMinutes, format } from 'date-fns';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { AppointmentService } from '../../services/appointment.service';
import { AvailabilityService } from '../../services/availability.service';
import { Appointment, AppointmentStatus, ConsultationType } from '../../models/appointment.model';
import { DoctorAvailability, AvailabilityType } from '../../models/availability.model';

interface CalendarEventExtended extends CalendarEvent {
  meta?: Appointment | DoctorAvailability;
  cssClass?: string;
}

@Component({
  selector: 'app-doctor-calendar',
  templateUrl: './doctor-calendar.component.html',
  styleUrls: ['./doctor-calendar.component.scss']
})
export class DoctorCalendarComponent implements OnInit, OnDestroy {
  view: CalendarView = CalendarView.Week;
  CalendarView = CalendarView;
  viewDate: Date = new Date();
  events: CalendarEventExtended[] = [];
  availabilities: DoctorAvailability[] = [];
  private destroy$ = new Subject<void>();
  availableSlots: number = 0;
  selectedSlot: Date | null = null;
  showAppointmentForm = false;
  refresh = new Subject<void>();

  // Calendar display settings
  dayStartHour = 8;
  dayEndHour = 14;
  hourSegments = 2;
  hourSegmentHeight = 30;

  constructor(
    private appointmentService: AppointmentService,
    private availabilityService: AvailabilityService
  ) {}

  ngOnInit() {
    this.loadAppointments();
    this.loadAvailabilities();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAppointments() {
    this.appointmentService.getAppointments()
      .pipe(takeUntil(this.destroy$))
      .subscribe(appointments => {
        this.events = appointments.map(appointment => ({
          title: `${appointment.consultationType}: ${appointment.patientName}${appointment.status === AppointmentStatus.CANCELLED ? ' (Odwołana)' : ''}`,
          start: new Date(appointment.start),
          end: new Date(appointment.end),
          color: appointment.status === AppointmentStatus.CANCELLED 
            ? { primary: '#9e9e9e', secondary: '#f5f5f5' } 
            : this.getEventColor(appointment.consultationType),
          draggable: false,
          resizable: {
            beforeStart: false,
            afterEnd: false
          },
          meta: appointment,
          cssClass: `appointment-event ${appointment.status === AppointmentStatus.CANCELLED ? 'cancelled' : ''}`
        }));
        this.refresh.next();
      });
  }

  loadAvailabilities() {
    this.availabilityService.getAvailabilities()
      .pipe(takeUntil(this.destroy$))
      .subscribe(availabilities => {
        this.availabilities = availabilities;
        this.refresh.next();
      });
  }

  beforeWeekViewRender(event: CalendarWeekViewBeforeRenderEvent): void {
    // Dodaj licznik konsultacji do nagłówków
    event.header.forEach(day => {
      const appointmentsForDay = this.getAppointmentCount(day.date);

      if (appointmentsForDay > 0) {
        day.cssClass = `has-appointments appointments-${appointmentsForDay}`;
      }
    });

    // Obsłuż dostępność w kolumnach
    event.hourColumns.forEach(hourColumn => {
      hourColumn.hours.forEach(hour => {
        hour.segments.forEach(segment => {
          const segmentDate = segment.date;
          const isAvailable = this.isTimeSlotWithinAvailability(segmentDate);
          const isUnavailable = this.isTimeSlotDuringAbsence(segmentDate);

          if (isAvailable) {
            segment.cssClass = 'available';
          } else if (isUnavailable) {
            segment.cssClass = 'unavailable';
          }
        });
      });
    });
  }

  private getEventColor(type: ConsultationType): { primary: string; secondary: string } {
    switch (type) {
      case ConsultationType.FIRST_VISIT:
        return { primary: '#1e88e5', secondary: '#bbdefb' };
      case ConsultationType.FOLLOW_UP:
        return { primary: '#43a047', secondary: '#c8e6c9' };
      case ConsultationType.PRESCRIPTION:
        return { primary: '#fb8c00', secondary: '#ffe0b2' };
      case ConsultationType.CONSULTATION:
      default:
        return { primary: '#7b1fa2', secondary: '#e1bee7' };
    }
  }

  handleEventClick(event: { event: CalendarEventExtended }) {
    // Kliknięcie w całe wydarzenie nie robi nic
  }

  handleCancelClick(mouseEvent: MouseEvent, event: CalendarEventExtended) {
    mouseEvent.stopPropagation(); // Zatrzymaj propagację, żeby nie wywołać handleEventClick
    
    const appointment = event.meta as Appointment;
    if (appointment) {
      if (confirm(`Czy chcesz odwołać wizytę?\n\nPacjent: ${appointment.patientName}\nTyp: ${appointment.consultationType}\nData: ${format(event.start, 'dd.MM.yyyy HH:mm')}`)) {
        this.cancelAppointment(appointment.id!);
      }
    }
  }

  async cancelAppointment(appointmentId: string) {
    try {
      await firstValueFrom(this.appointmentService.cancelAppointment(appointmentId));
      this.loadAppointments(); // Odśwież listę wizyt po anulowaniu
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    }
  }

  handleSlotClick(event: { date: Date }) {
    this.selectedSlot = event.date;
    this.showAppointmentForm = true;
  }

  onAppointmentCreated() {
    this.loadAppointments();
    this.closeForm();
  }

  onFormClosed() {
    this.closeForm();
  }

  closeForm() {
    this.showAppointmentForm = false;
    this.selectedSlot = null;
  }

  getEventTooltip(event: CalendarEventExtended): string {
    if (!event.meta || !('consultationType' in event.meta)) {
      return '';
    }

    const appointment = event.meta as Appointment;
    return `
      <div class="event-tooltip">
        <div class="tooltip-header" style="background-color: ${event.color?.primary}">
          <strong>${appointment.consultationType}</strong>
        </div>
        <div class="tooltip-content">
          <p>Patient: ${appointment.patientName}</p>
          <p>Time: ${format(event.start, 'HH:mm')} - ${format(event.end || addMinutes(event.start, 30), 'HH:mm')}</p>
        </div>
      </div>
    `;
  }

  getAppointmentCount(date: Date): number {
    return this.events.filter(event => 
      isSameDay(new Date(event.start), date)
    ).length;
  }

  isTimeSlotWithinAvailability(time: Date): boolean {
    // Najpierw sprawdź czy nie ma nieobecności w tym czasie
    if (this.isTimeSlotDuringAbsence(time)) {
      return false;
    }

    return this.availabilities.some(availability => {
      if (availability.type === AvailabilityType.ABSENCE) {
        return false;
      }

      const availabilityStart = new Date(availability.startDate);
      const availabilityEnd = new Date(availability.endDate);
      const timeDate = startOfDay(time);

      // Sprawdź czy data jest w zakresie dostępności
      if (timeDate < startOfDay(availabilityStart) || timeDate > startOfDay(availabilityEnd)) {
        return false;
      }

      // Dla cyklicznej dostępności sprawdź dzień tygodnia
      if (availability.type === AvailabilityType.RECURRING) {
        if (!availability.weekDays?.includes(time.getDay())) {
          return false;
        }
      }

      // Sprawdź czy czas mieści się w przedziale godzinowym
      return availability.timeSlots?.some(slot => {
        const [startHour, startMinute] = slot.start.split(':').map(Number);
        const [endHour, endMinute] = slot.end.split(':').map(Number);

        const slotStart = new Date(time);
        slotStart.setHours(startHour, startMinute, 0);

        const slotEnd = new Date(time);
        slotEnd.setHours(endHour, endMinute, 0);

        return time >= slotStart && time < slotEnd;
      }) || false;
    });
  }

  isTimeSlotDuringAbsence(time: Date): boolean {
    return this.availabilities.some(availability => {
      if (availability.type !== AvailabilityType.ABSENCE) {
        return false;
      }

      const availabilityStart = new Date(availability.startDate);
      const availabilityEnd = new Date(availability.endDate);
      const timeDate = startOfDay(time);

      // Sprawdź czy data jest w zakresie nieobecności
      if (timeDate < startOfDay(availabilityStart) || timeDate > startOfDay(availabilityEnd)) {
        return false;
      }

      // Sprawdź czy czas mieści się w przedziale godzinowym
      return availability.timeSlots?.some(slot => {
        const [startHour, startMinute] = slot.start.split(':').map(Number);
        const [endHour, endMinute] = slot.end.split(':').map(Number);

        const slotStart = new Date(time);
        slotStart.setHours(startHour, startMinute, 0);

        const slotEnd = new Date(time);
        slotEnd.setHours(endHour, endMinute, 0);

        return time >= slotStart && time < slotEnd;
      }) || false;
    });
  }
}
