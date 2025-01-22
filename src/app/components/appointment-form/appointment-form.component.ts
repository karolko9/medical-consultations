import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { addMinutes } from 'date-fns';
import { Appointment, ConsultationType, AppointmentStatus } from '../../models/appointment.model';
import { AppointmentService } from '../../services/appointment.service';
import { CartService } from '../../services/cart.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-appointment-form',
  templateUrl: './appointment-form.component.html',
  styleUrls: ['./appointment-form.component.scss']
})
export class AppointmentFormComponent implements OnInit {
  @Input() selectedDate!: Date;
  @Output() appointmentCreated = new EventEmitter<void>();
  @Output() closeForm = new EventEmitter<void>();

  appointmentForm: FormGroup;
  consultationTypes = Object.values(ConsultationType);
  maxDuration = 180; // 3 hours
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private appointmentService: AppointmentService,
    private cartService: CartService
  ) {
    this.appointmentForm = this.fb.group({
      patientName: ['', Validators.required],
      patientAge: ['', [Validators.required, Validators.min(0), Validators.max(150)]],
      patientGender: ['', Validators.required],
      consultationType: [ConsultationType.CONSULTATION, Validators.required],
      duration: [30, [Validators.required, Validators.min(30), Validators.max(180)]],
      additionalInfo: ['']
    });
  }

  ngOnInit() {
    this.appointmentForm.get('duration')?.setValidators([
      Validators.required,
      Validators.min(30),
      Validators.max(this.maxDuration)
    ]);
  }

  async onSubmit() {
    if (this.appointmentForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      try {
        const formValue = this.appointmentForm.value;
        const end = addMinutes(this.selectedDate, formValue.duration);
        
        const appointment: Appointment = {
          start: this.selectedDate,
          end: end,
          duration: formValue.duration,
          title: `${formValue.consultationType}: ${formValue.patientName}`,
          patientName: formValue.patientName,
          patientGender: formValue.patientGender,
          patientAge: formValue.patientAge,
          consultationType: formValue.consultationType,
          additionalInfo: formValue.additionalInfo,
          status: AppointmentStatus.PENDING
        };

        // Używamy firstValueFrom aby przekonwertować Observable na Promise
        const savedAppointment = await firstValueFrom(this.appointmentService.addAppointment(appointment));
        await this.cartService.addToCart(savedAppointment);
        
        this.appointmentCreated.emit();
        this.closeForm.emit();
      } catch (error) {
        console.error('Error creating appointment:', error);
        alert('Nie udało się utworzyć wizyty. Spróbuj ponownie.');
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  onCancel() {
    this.closeForm.emit();
  }

  get formattedDate(): string {
    return this.selectedDate ? 
      new Date(this.selectedDate).toLocaleString('pl-PL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';
  }

  get availableDuration(): string {
    const hours = Math.floor(this.maxDuration / 60);
    const minutes = this.maxDuration % 60;
    return hours > 0 ? 
      `${hours} godzin${hours === 1 ? 'a' : 'y'} ${minutes > 0 ? `i ${minutes} minut` : ''}` : 
      `${minutes} minut`;
  }
}
