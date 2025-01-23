import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
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
import { AuthService } from '../../services/auth.service';

interface CalendarEventExtended extends CalendarEvent {
  meta?: {
    type?: string;
    availability?: DoctorAvailability;
    doctorId?: string;
  } & Partial<Appointment>;
  cssClass?: string;
}

@Component({
  selector: 'app-doctor-calendar',
  templateUrl: './doctor-calendar.component.html',
  styleUrls: ['./doctor-calendar.component.scss']
})
export class DoctorCalendarComponent implements OnInit, OnDestroy {
  @Input() doctorId: string | undefined;
  @Output() dateSelected = new EventEmitter<Date>();

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
  private DEBUG = true;

  // Calendar display settings
  dayStartHour = 8;
  dayEndHour = 13;
  hourSegments = 2;
  hourSegmentHeight = 30;

  constructor(
    private appointmentService: AppointmentService,
    private availabilityService: AvailabilityService,
    private authService: AuthService
  ) {}

  private log(...args: any[]) {
    if (this.DEBUG) {
      console.log('[DoctorCalendarComponent]', ...args);
    }
  }

  ngOnInit() {
    this.log('Inicjalizacja komponentu kalendarza');
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.log('Zalogowany użytkownik:', user);
        if (!this.doctorId) {
          this.doctorId = user.uid;
          this.log('Ustawiono doctorId z zalogowanego użytkownika:', this.doctorId);
        }
        this.loadAppointments();
        this.loadAvailabilities();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAvailabilities() {
    if (!this.doctorId) {
      this.log('Brak doctorId - nie można załadować dostępności');
      return;
    }

    this.log('Ładowanie dostępności dla doctorId:', this.doctorId);
    this.availabilityService.getDoctorAvailabilities(this.doctorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (availabilities: DoctorAvailability[]) => {
          this.log('Załadowano dostępności:', availabilities);
          this.availabilities = availabilities;
          this.updateCalendarEvents();
        },
        error: (error) => {
          this.log('Błąd podczas ładowania dostępności:', error);
        }
      });
  }

  loadAppointments() {
    if (!this.doctorId) {
      this.log('Brak doctorId - nie można załadować wizyt');
      return;
    }

    this.log('Ładowanie wizyt dla doctorId:', this.doctorId);
    this.appointmentService.getAppointmentsByDoctor(this.doctorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (appointments) => {
          this.log('Załadowano wizyty:', appointments);
          this.events = appointments.map(appointment => ({
            start: new Date(appointment.start),
            end: new Date(appointment.end),
            title: appointment.title,
            color: this.getEventStatusColor(appointment.status),
            resizable: {
              beforeStart: false,
              afterEnd: false
            },
            draggable: false,
            meta: appointment,
            cssClass: `appointment-event ${appointment.status.toLowerCase()}`
          }));
          this.updateCalendarEvents();
        },
        error: (error) => {
          this.log('Błąd podczas ładowania wizyt:', error);
        }
      });
  }

  beforeWeekViewRender(event: CalendarWeekViewBeforeRenderEvent): void {
    this.log('Renderowanie widoku tygodnia');
    event.hourColumns.forEach(hourColumn => {
      const date = hourColumn.date;
      
      hourColumn.hours.forEach(hour => {
        hour.segments.forEach(segment => {
          const segmentDate = segment.date;
          let classes = [];
          
          // Sprawdź czy segment jest w przeszłości
          if (segmentDate < new Date()) {
            this.log('Segment w przeszłości:', segmentDate);
            classes.push('past-time');
          } else {
            // Sprawdź czy jest to czas nieobecności
            const isAbsence = this.isTimeSlotDuringAbsence(segmentDate);
            if (isAbsence) {
              this.log('Segment w czasie nieobecności:', segmentDate);
              classes.push('absence-time');
            } else {
              // Sprawdź czy jest to czas dostępności
              const isAvailable = this.isTimeSlotWithinAvailability(segmentDate);
              if (isAvailable) {
                this.log('Segment w czasie dostępności:', segmentDate);
                classes.push('available');
              }
            }
          }

          segment.cssClass = classes.join(' ');
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
    const clickedDate = event.date;
    
    // Sprawdź czy slot nie przypada na okres nieobecności
    if (this.isTimeSlotDuringAbsence(clickedDate)) {
      // Możemy dodać powiadomienie dla użytkownika
      alert('Nie można zarezerwować wizyty w tym terminie - lekarz jest nieobecny.');
      return;
    }

    // Sprawdź czy slot jest w dozwolonym zakresie czasowym
    if (!this.isTimeSlotWithinAvailability(clickedDate)) {
      alert('Lekarz nie przyjmuje w tym terminie.');
      return;
    }

    // Sprawdź czy slot nie jest w przeszłości
    if (clickedDate < new Date()) {
      alert('Nie można zarezerwować wizyty w przeszłości.');
      return;
    }

    this.onSlotSelected(clickedDate);
  }

  onSlotSelected(date: Date) {
    this.selectedSlot = date;
    this.dateSelected.emit(date);
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

      const availabilityStart = startOfDay(new Date(availability.startDate));
      const availabilityEnd = endOfDay(new Date(availability.endDate));
      const timeDate = new Date(time);

      return timeDate >= availabilityStart && timeDate <= availabilityEnd;
    });
  }

  updateCalendarEvents() {
    this.log('Aktualizacja wydarzeń w kalendarzu');
    // Teraz obsługujemy tylko wizyty, dostępności są wyświetlane jako tło
    const allEvents: CalendarEventExtended[] = [];

    // Dodaj wizyty do kalendarza
    this.log('Przetwarzanie wizyt:', this.events);
    this.events.forEach(event => {
      const appointmentMeta = event.meta as { doctorId?: string } & Partial<Appointment>;
      if (appointmentMeta?.doctorId === this.doctorId) {
        this.log('Dodawanie wizyty:', event);
        const appointment = event.meta as Appointment;
        const eventColor = this.getEventStatusColor(appointment.status);
        
        allEvents.push({
          ...event,
          color: eventColor,
          cssClass: `appointment-event ${appointment.status.toLowerCase()}`
        });
      }
    });

    this.log('Wszystkie wydarzenia po aktualizacji:', allEvents);
    this.events = allEvents;
    this.refresh.next();
  }

  private getEventStatusColor(status: AppointmentStatus): { primary: string; secondary: string } {
    switch (status) {
      case AppointmentStatus.PENDING:
        return { primary: '#ffa726', secondary: '#ffe0b2' }; // Pomarańczowy
      case AppointmentStatus.CONFIRMED:
        return { primary: '#66bb6a', secondary: '#c8e6c9' }; // Zielony
      case AppointmentStatus.CANCELLED:
        return { primary: '#ef5350', secondary: '#ffcdd2' }; // Czerwony
      case AppointmentStatus.COMPLETED:
        return { primary: '#8e24aa', secondary: '#e1bee7' }; // Fioletowy
      default:
        return { primary: '#90a4ae', secondary: '#cfd8dc' }; // Szary
    }
  }
}
