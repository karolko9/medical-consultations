import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { User } from '../../models/user.model';
import { DoctorService } from '../../services/doctor.service';

@Component({
  selector: 'app-doctor-list',
  templateUrl: './doctor-list.component.html',
  styleUrls: ['./doctor-list.component.scss']
})
export class DoctorListComponent implements OnInit {
  doctors$: Observable<User[]>;
  searchControl = new FormControl('');
  loading = new BehaviorSubject<boolean>(true);
  error = new BehaviorSubject<string | null>(null);

  constructor(private doctorService: DoctorService) {
    const search$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged()
    );

    this.doctors$ = combineLatest([search$]).pipe(
      switchMap(([searchTerm]) => {
        this.loading.next(true);
        this.error.next(null);
        return searchTerm 
          ? this.doctorService.searchDoctors(searchTerm)
          : this.doctorService.getDoctors();
      }),
      map(doctors => {
        this.loading.next(false);
        return doctors;
      })
    );
  }

  ngOnInit(): void {
    // Obserwuj błędy
    this.doctors$.subscribe({
      error: (err) => {
        console.error('Error loading doctors:', err);
        this.error.next('Wystąpił błąd podczas ładowania listy lekarzy.');
        this.loading.next(false);
      }
    });
  }

  onMakeAppointment(doctor: User): void {
    // TODO: Implement appointment creation
    console.log('Make appointment with doctor:', doctor);
  }
}
