import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConsultationType } from '../../models/appointment.model';

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-form.component.html',
  styleUrls: ['./appointment-form.component.scss']
})
export class AppointmentFormComponent {
  @Input() startTime!: Date;
  @Input() availableSlots: number = 1;
  @Output() submitAppointment = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  appointmentForm: FormGroup;
  consultationTypes = Object.values(ConsultationType);
  
  constructor(private fb: FormBuilder) {
    this.appointmentForm = this.fb.group({
      duration: [30, [Validators.required, Validators.min(30), Validators.max(180)]],
      consultationType: [ConsultationType.FIRST_VISIT, Validators.required],
      patientName: ['', [Validators.required, Validators.minLength(3)]],
      patientGender: ['', Validators.required],
      patientAge: ['', [Validators.required, Validators.min(0), Validators.max(150)]],
      additionalInfo: ['']
    });
  }

  onSubmit() {
    if (this.appointmentForm.valid) {
      const formValue = this.appointmentForm.value;
      const appointment = {
        ...formValue,
        start: this.startTime,
        end: new Date(this.startTime.getTime() + formValue.duration * 60000) // Convert minutes to milliseconds
      };
      this.submitAppointment.emit(appointment);
    }
  }

  onCancel() {
    this.cancel.emit();
  }

  // Helper method to get available duration options based on available slots
  getDurationOptions(): number[] {
    const options = [];
    for (let i = 1; i <= Math.min(6, this.availableSlots); i++) {
      options.push(i * 30); // 30-minute increments
    }
    return options;
  }

  // Getters for form controls
  get duration() { return this.appointmentForm.get('duration'); }
  get consultationType() { return this.appointmentForm.get('consultationType'); }
  get patientName() { return this.appointmentForm.get('patientName'); }
  get patientGender() { return this.appointmentForm.get('patientGender'); }
  get patientAge() { return this.appointmentForm.get('patientAge'); }
}
