import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Appointment, ConsultationType } from '../../models/appointment.model';

@Component({
  selector: 'app-appointment-form',
  templateUrl: './appointment-form.component.html',
  styleUrls: ['./appointment-form.component.scss']
})
export class AppointmentFormComponent implements OnInit {
  @Input() startTime!: Date;
  @Input() availableSlots: number = 1;
  @Output() submitAppointment = new EventEmitter<Partial<Appointment>>();
  @Output() cancel = new EventEmitter<void>();

  appointmentForm!: FormGroup;
  consultationTypes = Object.values(ConsultationType);

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.appointmentForm = this.fb.group({
      duration: [30, [Validators.required, Validators.min(30), Validators.max(120)]],
      consultationType: [ConsultationType.CONSULTATION, Validators.required],
      patientName: ['', [Validators.required, Validators.minLength(3)]],
      patientGender: ['', Validators.required],
      patientAge: ['', [Validators.required, Validators.min(0), Validators.max(150)]],
      notes: ['']
    });
  }

  onSubmit() {
    if (this.appointmentForm.valid) {
      const formValue = this.appointmentForm.value;
      this.submitAppointment.emit({
        ...formValue,
        start: this.startTime,
        end: new Date(this.startTime.getTime() + formValue.duration * 60000)
      });
    }
  }

  onCancel() {
    this.cancel.emit();
  }

  getDurationOptions(): number[] {
    const maxDuration = Math.min(this.availableSlots * 30, 120);
    const durations: number[] = [];
    for (let i = 30; i <= maxDuration; i += 30) {
      durations.push(i);
    }
    return durations;
  }

  // Getters for form controls
  get duration() { return this.appointmentForm.get('duration'); }
  get consultationType() { return this.appointmentForm.get('consultationType'); }
  get patientName() { return this.appointmentForm.get('patientName'); }
  get patientGender() { return this.appointmentForm.get('patientGender'); }
  get patientAge() { return this.appointmentForm.get('patientAge'); }
}
