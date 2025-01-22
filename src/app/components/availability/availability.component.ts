import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { DoctorAvailability, AvailabilityType, TimeSlot } from '../../models/availability.model';
import { AvailabilityService } from '../../services/availability.service';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-availability',
  templateUrl: './availability.component.html',
  styleUrls: ['./availability.component.scss']
})
export class AvailabilityComponent implements OnInit {
  availabilityForm!: FormGroup;
  selectedType: AvailabilityType = AvailabilityType.RECURRING;
  weekDays: string[] = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  availabilities: DoctorAvailability[] = [];
  availabilityTypes = AvailabilityType;
  today = new Date().toISOString().split('T')[0];

  constructor(
    private fb: FormBuilder,
    private availabilityService: AvailabilityService
  ) {
    this.createForm();
  }

  ngOnInit() {
    this.loadAvailabilities();
  }

  createForm() {
    this.availabilityForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      weekDaysArray: this.fb.array([]),
      timeSlots: this.fb.array([]),
      startTime: [''],
      endTime: ['']
    });

    // Add default time slot for recurring availability
    if (this.selectedType === AvailabilityType.RECURRING) {
      this.addTimeSlot();
    }

    // Update validators based on type
    this.updateFormValidators();
  }

  selectType(type: AvailabilityType) {
    this.selectedType = type;
    this.resetForm();
    this.updateFormValidators();
  }

  updateFormValidators() {
    const weekDaysArray = this.availabilityForm.get('weekDaysArray');
    const timeSlots = this.availabilityForm.get('timeSlots');
    const startTime = this.availabilityForm.get('startTime');
    const endTime = this.availabilityForm.get('endTime');

    // Reset validators
    weekDaysArray?.clearValidators();
    timeSlots?.clearValidators();
    startTime?.clearValidators();
    endTime?.clearValidators();

    if (this.selectedType === AvailabilityType.RECURRING) {
      weekDaysArray?.setValidators([Validators.required, Validators.minLength(1)]);
      timeSlots?.setValidators([Validators.required, Validators.minLength(1)]);
    } else if (this.selectedType === AvailabilityType.ONE_TIME || 
               this.selectedType === AvailabilityType.ABSENCE) {
      startTime?.setValidators([Validators.required]);
      endTime?.setValidators([Validators.required]);
    }

    // Update validity
    weekDaysArray?.updateValueAndValidity();
    timeSlots?.updateValueAndValidity();
    startTime?.updateValueAndValidity();
    endTime?.updateValueAndValidity();
  }

  resetForm() {
    this.availabilityForm.reset();
    this.weekDaysArray.clear();
    this.timeSlots.clear();

    if (this.selectedType === AvailabilityType.RECURRING) {
      this.addTimeSlot();
    }
  }

  get timeSlots() {
    return this.availabilityForm.get('timeSlots') as FormArray;
  }

  get weekDaysArray() {
    return this.availabilityForm.get('weekDaysArray') as FormArray;
  }

  get startDate() {
    return this.availabilityForm.get('startDate');
  }

  get endDate() {
    return this.availabilityForm.get('endDate');
  }

  get startTime() {
    return this.availabilityForm.get('startTime');
  }

  get endTime() {
    return this.availabilityForm.get('endTime');
  }

  addTimeSlot() {
    const timeSlot = this.fb.group({
      start: ['', Validators.required],
      end: ['', Validators.required]
    });

    this.timeSlots.push(timeSlot);
  }

  removeTimeSlot(index: number) {
    this.timeSlots.removeAt(index);
  }

  isWeekdaySelected(dayIndex: number): boolean {
    return this.weekDaysArray.value.includes(dayIndex);
  }

  toggleWeekday(dayIndex: number) {
    const index = this.weekDaysArray.value.indexOf(dayIndex);
    if (index === -1) {
      this.weekDaysArray.push(this.fb.control(dayIndex));
    } else {
      this.weekDaysArray.removeAt(index);
    }
  }

  async onSubmit() {
    if (this.availabilityForm.valid) {
      const formValue = this.availabilityForm.value;
      let availability: DoctorAvailability = {
        startDate: new Date(formValue.startDate),
        endDate: new Date(formValue.endDate),
        type: this.selectedType,
        timeSlots: []
      };

      if (this.selectedType === AvailabilityType.RECURRING) {
        availability.weekDays = formValue.weekDaysArray;
        availability.timeSlots = formValue.timeSlots;
      } else {
        availability.timeSlots = [{
          start: formValue.startTime,
          end: formValue.endTime
        }];
      }

      try {
        await firstValueFrom(this.availabilityService.addAvailability(availability));
        this.resetForm();
        this.loadAvailabilities();
      } catch (error) {
        console.error('Error adding availability:', error);
      }
    }
  }

  async loadAvailabilities() {
    try {
      const availabilities = await firstValueFrom(this.availabilityService.getAvailabilities());
      this.availabilities = availabilities;
    } catch (error) {
      console.error('Error loading availabilities:', error);
    }
  }

  async deleteAvailability(availability: DoctorAvailability) {
    if (availability.id) {
      try {
        await firstValueFrom(this.availabilityService.removeAvailability(availability.id));
        // Odśwież listę dostępności
        await this.loadAvailabilities();
      } catch (error) {
        console.error('Error deleting availability:', error);
      }
    }
  }

  getTypeLabel(type: AvailabilityType): string {
    switch (type) {
      case AvailabilityType.RECURRING:
        return 'Cykliczna dostępność';
      case AvailabilityType.ONE_TIME:
        return 'Jednorazowa dostępność';
      case AvailabilityType.ABSENCE:
        return 'Nieobecność';
      default:
        return '';
    }
  }

  getItemClass(item: DoctorAvailability): string {
    switch (item.type) {
      case AvailabilityType.RECURRING:
        return 'recurring';
      case AvailabilityType.ONE_TIME:
        return 'one-time';
      case AvailabilityType.ABSENCE:
        return 'absence';
      default:
        return '';
    }
  }

  formatDate(date: Date): string {
    return format(new Date(date), 'dd MMMM yyyy', { locale: pl });
  }

  formatWeekDays(weekDays: number[] | undefined): string {
    if (!weekDays) return '';
    return weekDays.map(day => this.weekDays[day]).join(', ');
  }

  formatTimeSlots(timeSlots: TimeSlot[] | undefined): string {
    if (!timeSlots) return '';
    return timeSlots.map(slot => `${slot.start} - ${slot.end}`).join(', ');
  }
}
