import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Appointment, ConsultationType } from '../../models/appointment.model';

@Component({
  selector: 'app-appointment-form',
  templateUrl: './appointment-form.component.html',
  styleUrls: ['./appointment-form.component.scss']
})
export class AppointmentFormComponent implements OnInit {
  @Input() selectedDate: Date | null = null;
  @Input() availableSlots: number = 0;
  @Output() appointmentSubmitted = new EventEmitter<Partial<Appointment>>();
  @Output() formClosed = new EventEmitter<void>();

  appointmentForm: FormGroup;
  consultationTypes = Object.values(ConsultationType);
  maxDuration: number = 30; // Default max duration

  constructor(private fb: FormBuilder) {
    this.appointmentForm = this.fb.group({
      patientName: ['', Validators.required],
      patientAge: ['', [Validators.required, Validators.min(0), Validators.max(150)]],
      patientGender: ['', Validators.required],
      consultationType: [ConsultationType.CONSULTATION, Validators.required],
      duration: [30, [Validators.required, Validators.min(30), Validators.max(180)]],
      notes: ['']
    });
  }

  ngOnInit() {
    // Update max duration based on available slots
    this.maxDuration = this.availableSlots * 30;
    this.appointmentForm.get('duration')?.setValidators([
      Validators.required,
      Validators.min(30),
      Validators.max(this.maxDuration)
    ]);
    this.appointmentForm.get('duration')?.updateValueAndValidity();
  }

  onSubmit() {
    if (this.appointmentForm.valid && this.selectedDate) {
      const formValue = this.appointmentForm.value;
      this.appointmentSubmitted.emit({
        ...formValue,
        start: this.selectedDate
      });
    }
  }

  onCancel() {
    this.formClosed.emit();
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
