import { Component, OnInit, OnDestroy } from '@angular/core';
import { 
  CalendarView, 
  CalendarEvent,
  CalendarEventTimesChangedEvent,
  CalendarWeekViewBeforeRenderEvent
} from 'angular-calendar';
import { addHours, startOfDay, endOfDay, addDays, isBefore, isSameDay, addMinutes, format } from 'date-fns';
import { Subject, takeUntil } from 'rxjs';
import { AppointmentService } from '../../services/appointment.service';
import { AvailabilityService } from '../../services/availability.service';
import { Appointment, AppointmentStatus, ConsultationType } from '../../models/appointment.model';
import { DoctorAvailability, AvailabilityType } from '../../models/availability.model';

interface WeekDayHeader {
  date: Date;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  isWeekend: boolean;
  appointmentCount?: number;
}

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
          title: `${appointment.consultationType}: ${appointment.patientName}`,
          start: new Date(appointment.start),
          end: new Date(appointment.end),
          color: this.getAppointmentColor(appointment.consultationType),
          draggable: false,
          resizable: {
            beforeStart: false,
            afterEnd: false
          },
          meta: appointment,
          cssClass: 'appointment-event'
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
    event.header?.forEach((day, index) => {
      const appointmentCount = this.getAppointmentCountForDay(day.date);
      (day as WeekDayHeader).appointmentCount = appointmentCount;
    });

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

  getAppointmentColor(type: ConsultationType) {
    switch (type) {
      case ConsultationType.CONSULTATION:
        return { primary: '#1e88e5', secondary: '#e3f2fd' };
      case ConsultationType.FOLLOW_UP:
        return { primary: '#7cb342', secondary: '#f1f8e9' };
      case ConsultationType.PROCEDURE:
        return { primary: '#fb8c00', secondary: '#fff3e0' };
      default:
        return { primary: '#757575', secondary: '#f5f5f5' };
    }
  }

  handleEventClick(event: { event: CalendarEventExtended }) {
    console.log('Event clicked:', event);
  }

  handleSlotClick(event: { date: Date }) {
    const clickedDate = event.date;
    if (this.isTimeSlotWithinAvailability(clickedDate) && !this.isTimeSlotDuringAbsence(clickedDate)) {
      this.selectedSlot = clickedDate;
      this.calculateAvailableSlots(clickedDate);
      this.showAppointmentForm = true;
    }
  }

  calculateAvailableSlots(startTime: Date): void {
    let availableCount = 0;
    let currentTime = startTime;
    
    while (availableCount < 6) {
      const nextSlot = addMinutes(currentTime, 30);
      const nextSlotHour = nextSlot.getHours();
      const nextSlotMinutes = nextSlot.getMinutes();
      
      const isWithinHours = nextSlotHour < 14 || (nextSlotHour === 14 && nextSlotMinutes === 0);
      const isSlotAvailable = !this.events.some(event => {
        const eventEnd = event.end || addMinutes(event.start, 30);
        return currentTime >= event.start && currentTime < eventEnd;
      });

      const isWithinAvailability = this.isTimeSlotWithinAvailability(currentTime);
      const isNotDuringAbsence = !this.isTimeSlotDuringAbsence(currentTime);

      if (!isWithinHours || !isSlotAvailable || !isWithinAvailability || !isNotDuringAbsence) {
        break;
      }

      availableCount++;
      currentTime = nextSlot;
    }

    this.availableSlots = availableCount;
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

  getAppointmentCountForDay(date: Date): number {
    return this.events.filter(event => {
      const eventDate = new Date(event.start);
      return isSameDay(eventDate, date) && 
             event.meta !== undefined &&
             'consultationType' in event.meta &&
             (event.meta as Appointment).status !== AppointmentStatus.CANCELLED;
    }).length;
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

  onAppointmentSubmitted(appointment: Partial<Appointment>) {
    if (this.selectedSlot) {
      const newAppointment: Appointment = {
        ...appointment as Appointment,
        start: this.selectedSlot,
        end: addMinutes(this.selectedSlot, appointment.duration || 30),
        status: AppointmentStatus.SCHEDULED
      };

      this.appointmentService.addAppointment(newAppointment)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.loadAppointments();
          this.closeForm();
        });
    }
  }

  closeForm(): void {
    this.showAppointmentForm = false;
    this.selectedSlot = null;
  }
}
