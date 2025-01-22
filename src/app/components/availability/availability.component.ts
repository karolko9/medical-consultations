import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { DoctorAvailability, AvailabilityType, TimeSlot } from '../../models/availability.model';
import { AvailabilityService } from '../../services/availability.service';
import { AppointmentService } from '../../services/appointment.service';
import { CartService } from '../../services/cart.service';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { firstValueFrom, Subscription } from 'rxjs';

@Component({
  selector: 'app-availability',
  templateUrl: './availability.component.html',
  styleUrls: ['./availability.component.scss']
})
export class AvailabilityComponent implements OnInit, OnDestroy {
  availabilityForm!: FormGroup;
  selectedType: AvailabilityType = AvailabilityType.RECURRING;
  weekDays: string[] = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  availabilities: DoctorAvailability[] = [];
  availabilityTypes = AvailabilityType;
  today = new Date().toISOString().split('T')[0];
  private availabilitiesSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private availabilityService: AvailabilityService,
    private appointmentService: AppointmentService,
    private cartService: CartService
  ) {
    this.createForm();
  }

  ngOnInit() {
    this.loadAvailabilities();
  }

  ngOnDestroy() {
    if (this.availabilitiesSubscription) {
      this.availabilitiesSubscription.unsubscribe();
    }
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

    // Initialize weekDaysArray with checkboxes
    this.weekDays.forEach(() => {
      (this.availabilityForm.get('weekDaysArray') as FormArray).push(this.fb.control(false));
    });
  }

  loadAvailabilities() {
    this.availabilitiesSubscription = this.availabilityService.getAvailabilities()
      .subscribe(availabilities => {
        this.availabilities = availabilities;
      });
  }

  async onSubmit() {
    if (this.availabilityForm.valid) {
      const formValue = this.availabilityForm.value;
      
      // Create availability object
      const availability: DoctorAvailability = {
        type: this.selectedType,
        startDate: formValue.startDate,  // Send as string
        endDate: formValue.endDate,      // Send as string
        weekDays: this.selectedType === AvailabilityType.RECURRING 
          ? formValue.weekDaysArray
            .map((checked: boolean, index: number) => checked ? index : -1)
            .filter((day: number) => day !== -1)
          : [],
        timeSlots: this.selectedType !== AvailabilityType.ABSENCE 
          ? (this.availabilityForm.get('timeSlots') as FormArray).value
          : []
      };

      try {
        await firstValueFrom(this.availabilityService.addAvailability(availability));

        // Jeśli dodajemy nieobecność, anuluj wszystkie wizyty w tym okresie
        if (this.selectedType === AvailabilityType.ABSENCE) {
          const startDate = new Date(formValue.startDate);
          startDate.setHours(0, 0, 0, 0); // początek dnia

          const endDate = new Date(formValue.endDate);
          endDate.setHours(23, 59, 59, 999); // koniec dnia

          console.log('Canceling appointments between:', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          });

          await this.appointmentService.cancelAppointmentsInRange(startDate, endDate);
        }

        this.availabilityForm.reset();
        this.createForm(); // Reset form with initial structure
      } catch (error) {
        console.error('Error adding availability:', error);
      }
    }
  }

  async removeAvailability(id: string) {
    try {
      await firstValueFrom(this.availabilityService.removeAvailability(id));
    } catch (error) {
      console.error('Error removing availability:', error);
    }
  }

  // Form array getters and methods
  get timeSlotsFormArray() {
    return this.availabilityForm.get('timeSlots') as FormArray;
  }

  addTimeSlot() {
    const timeSlot = this.fb.group({
      start: ['', Validators.required],
      end: ['', Validators.required]
    });
    this.timeSlotsFormArray.push(timeSlot);
  }

  removeTimeSlot(index: number) {
    this.timeSlotsFormArray.removeAt(index);
  }

  onTypeChange(type: AvailabilityType) {
    this.selectedType = type;
    
    // Clear time slots
    while (this.timeSlotsFormArray.length) {
      this.timeSlotsFormArray.removeAt(0);
    }
    
    // Add default time slot for recurring and one-time availabilities
    if (type !== AvailabilityType.ABSENCE) {
      this.addTimeSlot();
    }
  }

  formatDate(date: Date | string | null): string {
    if (!date) return 'No date';
    
    try {
      let dateObj: Date;
      
      if (typeof date === 'string') {
        // Handle Firebase timestamp format
        if (date.hasOwnProperty('seconds')) {
          const timestamp = (date as any).seconds * 1000;
          dateObj = new Date(timestamp);
        } else {
          dateObj = new Date(date);
        }
      } else {
        dateObj = date;
      }

      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date object:', date);
        return 'Invalid date';
      }

      return format(dateObj, 'dd MMMM yyyy', { locale: pl });
    } catch (error) {
      console.error('Error formatting date:', error, 'Date value:', date);
      return 'Invalid date';
    }
  }

  formatTime(time: string): string {
    return time;
  }

  getSelectedDays(): string {
    const selectedDays = this.availabilityForm.value.weekDaysArray
      .map((checked: boolean, index: number) => checked ? this.weekDays[index] : null)
      .filter((day: string | null) => day !== null);
    return selectedDays.join(', ');
  }
}
