import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Appointment, ConsultationType, AppointmentStatus } from '../../models/appointment.model';
import { AppointmentService } from '../../services/appointment.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-appointment-form',
  templateUrl: './appointment-form.component.html',
  styleUrls: ['./appointment-form.component.scss']
})
export class AppointmentFormComponent implements OnInit {
  @Input() selectedDate: Date = new Date();
  @Output() appointmentCreated = new EventEmitter<void>();
  @Output() closeForm = new EventEmitter<void>();

  appointmentForm: FormGroup;
  consultationTypes = Object.values(ConsultationType);
  submitting = false;
  error: string | null = null;
  allDurations = [30, 60, 90, 120];
  availableDurations: number[] = [];
  loadingDurations = false;

  constructor(
    private fb: FormBuilder,
    private appointmentService: AppointmentService,
    private cartService: CartService
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

  ngOnInit(): void {
    this.checkAvailableDurations();
  }

  private isEndTimeValid(endDate: Date): boolean {
    const endTime = endDate.getHours() * 60 + endDate.getMinutes();
    const maxEndTime = 14 * 60; // 14:00
    return endTime <= maxEndTime;
  }

  async checkAvailableDurations() {
    this.loadingDurations = true;
    this.availableDurations = [];
    
    try {
      const startDate = new Date(this.selectedDate);
      
      for (const duration of this.allDurations) {
        const endDate = new Date(startDate.getTime() + duration * 60000);
        
        // Sprawdź czy koniec wizyty nie przekracza 14:00
        if (!this.isEndTimeValid(endDate)) {
          continue;
        }

        const hasConflict = await this.appointmentService.hasTimeSlotConflict(startDate, endDate);
        if (!hasConflict) {
          this.availableDurations.push(duration);
        }
      }

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
      console.error('Error checking available durations:', error);
      this.error = 'Wystąpił błąd podczas sprawdzania dostępnych terminów';
    } finally {
      this.loadingDurations = false;
    }
  }

  async onSubmit() {
    if (this.appointmentForm.valid && !this.submitting) {
      this.submitting = true;
      this.error = null;

      try {
        const formValue = this.appointmentForm.value;
        const startDate = new Date(this.selectedDate);
        const endDate = new Date(startDate.getTime() + formValue.duration * 60000);

        // Dodatkowe sprawdzenie przed zapisem
        if (!this.isEndTimeValid(endDate)) {
          throw new Error('Wizyta nie może kończyć się później niż 14:00');
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

        const savedAppointment = await this.appointmentService.addAppointment(appointment);
        this.cartService.addToCart(savedAppointment);
        this.appointmentCreated.emit();
        this.closeForm.emit();
      } catch (error: any) {
        this.error = error.message || 'Error creating appointment';
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

  get formattedDate(): string {
    return this.selectedDate.toLocaleDateString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
