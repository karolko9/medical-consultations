import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Appointment, ConsultationType, AppointmentStatus } from '../../models/appointment.model';
import { AppointmentService } from '../../services/appointment.service';
import { CartService } from '../../services/cart.service';
import { AvailabilityService } from '../../services/availability.service';
import { DoctorAvailability, TimeSlot } from '../../models/availability.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-appointment-form',
  templateUrl: './appointment-form.component.html',
  styleUrls: ['./appointment-form.component.scss']
})
export class AppointmentFormComponent implements OnInit {
  @Input() selectedDate: Date = new Date();
  @Input() doctorId: string | undefined;
  @Output() appointmentCreated = new EventEmitter<void>();
  @Output() closeForm = new EventEmitter<void>();

  appointmentForm: FormGroup;
  consultationTypes = Object.values(ConsultationType);
  submitting = false;
  error: string | null = null;
  allDurations = [30, 60, 90, 120];
  availableDurations: number[] = [];
  loadingDurations = false;
  availableTimeSlots: TimeSlot[] = [];
  private DEBUG = true;

  constructor(
    private fb: FormBuilder,
    private appointmentService: AppointmentService,
    private cartService: CartService,
    private availabilityService: AvailabilityService
  ) {
    this.appointmentForm = this.fb.group({
      patientName: ['', Validators.required],
      patientGender: ['', Validators.required],
      patientAge: ['', [Validators.required, Validators.min(0), Validators.max(150)]],
      consultationType: [ConsultationType.FIRST_VISIT, Validators.required],
      additionalInfo: [''],
      duration: [30, [Validators.required, Validators.min(30)]]
    });
  }

  private log(...args: any[]) {
    if (this.DEBUG) {
      console.log('[AppointmentForm]', ...args);
    }
  }

  ngOnInit() {
    this.log('Inicjalizacja formularza wizyty', { doctorId: this.doctorId });
    if (!this.doctorId) {
      console.error('DoctorId is required but not provided');
      this.error = 'Błąd: Nie można utworzyć wizyty bez identyfikatora lekarza';
      return;
    }
    this.loadAvailabilities();
  }

  loadAvailabilities() {
    if (!this.doctorId) return;
    
    this.log('Ładowanie dostępności dla lekarza', { 
      doctorId: this.doctorId, 
      selectedDate: this.selectedDate 
    });

    this.availabilityService.getDoctorAvailabilityForDay(this.selectedDate, this.doctorId)
      .subscribe({
        next: (availableSlots) => {
          this.log('Załadowano dostępne sloty', { 
            count: availableSlots.length, 
            slots: availableSlots 
          });
          this.availableTimeSlots = availableSlots;
          this.checkAvailableDurations();
        },
        error: (error) => {
          this.log('Błąd podczas ładowania dostępności', error);
          this.error = 'Wystąpił błąd podczas ładowania dostępnych terminów';
        }
      });
  }

  isWithinAvailability(startDate: Date, endDate: Date): boolean {
    if (!this.availableTimeSlots.length) return false;

    const startTime = startDate.getHours().toString().padStart(2, '0') + ':' + 
                     startDate.getMinutes().toString().padStart(2, '0');
    const endTime = endDate.getHours().toString().padStart(2, '0') + ':' + 
                   endDate.getMinutes().toString().padStart(2, '0');

    return this.availableTimeSlots.some(slot => 
      startTime >= slot.start && endTime <= slot.end
    );
  }

  isEndTimeValid(endDate: Date): boolean {
    const endHour = endDate.getHours();
    const endMinutes = endDate.getMinutes();
    return endHour < 14 || (endHour === 14 && endMinutes === 0);
  }

  async checkAvailableDurations() {
    this.loadingDurations = true;
    this.availableDurations = [];
    this.error = null;

    this.log('Sprawdzanie dostępnych długości wizyt');

    try {
      for (const duration of this.allDurations) {
        const startDate = new Date(this.selectedDate);
        const endDate = new Date(startDate.getTime() + duration * 60000);
        
        this.log('Sprawdzanie długości wizyty', { 
          duration, 
          startDate: startDate.toISOString(), 
          endDate: endDate.toISOString() 
        });

        if (!this.isEndTimeValid(endDate)) {
          this.log('Wizyta kończy się po 14:00, pomijanie');
          continue;
        }

        if (!this.isWithinAvailability(startDate, endDate)) {
          this.log('Wizyta poza dostępnością lekarza, pomijanie');
          continue;
        }

        const hasConflict = await firstValueFrom(
          this.appointmentService.hasTimeSlotConflict(startDate, endDate)
        );
        
        this.log('Sprawdzono konflikt terminów', { 
          duration, 
          hasConflict 
        });

        if (!hasConflict) {
          this.availableDurations.push(duration);
        }
      }

      this.log('Znalezione dostępne długości wizyt', { 
        availableDurations: this.availableDurations 
      });

      if (this.availableDurations.length === 0) {
        this.error = 'Brak dostępnych terminów o wybranej godzinie';
        this.appointmentForm.get('duration')?.disable();
      } else {
        this.error = null;
        this.appointmentForm.get('duration')?.enable();
        
        if (!this.appointmentForm.get('duration')?.value) {
          this.appointmentForm.get('duration')?.setValue(this.availableDurations[0]);
        }
      }
    } catch (error) {
      this.log('Błąd podczas sprawdzania dostępnych długości wizyt', error);
      this.error = 'Wystąpił błąd podczas sprawdzania dostępnych terminów';
    } finally {
      this.loadingDurations = false;
    }
  }

  async onSubmit() {
    if (!this.doctorId) {
      this.error = 'Błąd: Nie można utworzyć wizyty bez identyfikatora lekarza';
      return;
    }

    if (this.appointmentForm.valid && !this.submitting) {
      this.submitting = true;
      this.error = null;

      try {
        const formValue = this.appointmentForm.value;
        const startDate = new Date(this.selectedDate);
        const endDate = new Date(startDate.getTime() + formValue.duration * 60000);

        if (!this.isEndTimeValid(endDate)) {
          throw new Error('Wizyta nie może kończyć się później niż 14:00');
        }

        if (!this.isWithinAvailability(startDate, endDate)) {
          throw new Error('Wizyta wykracza poza godziny przyjęć lekarza');
        }

        const appointment: Appointment = {
          start: startDate,
          end: endDate,
          title: `${formValue.consultationType}: ${formValue.patientName}`,
          patientName: formValue.patientName,
          patientGender: formValue.patientGender,
          patientAge: formValue.patientAge,
          consultationType: formValue.consultationType,
          additionalInfo: formValue.additionalInfo,
          status: AppointmentStatus.PENDING
        };

        const extendedAppointment = {
          ...appointment,
          doctorId: this.doctorId
        };

        const savedAppointment = await this.appointmentService.addAppointment(extendedAppointment);
        await this.cartService.addToCart(savedAppointment);
        this.appointmentCreated.emit();
        this.closeForm.emit();
      } catch (error: any) {
        this.error = error.message || 'Błąd podczas tworzenia wizyty';
        console.error('Error creating appointment:', error);
      } finally {
        this.submitting = false;
      }
    }
  }

  onCancel() {
    this.closeForm.emit();
  }

  get formControls() {
    return this.appointmentForm.controls;
  }

  formattedDate(): string {
    return this.selectedDate.toLocaleDateString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
