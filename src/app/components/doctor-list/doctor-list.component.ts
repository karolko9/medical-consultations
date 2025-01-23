import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { DoctorProfile, UserRole } from '../../models/user.model';
import { DoctorService } from '../../services/doctor.service';
import { SeedService } from '../../services/seed.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-doctor-list',
  templateUrl: './doctor-list.component.html',
  styleUrls: ['./doctor-list.component.scss']
})
export class DoctorListComponent implements OnInit {
  doctors$: Observable<DoctorProfile[]>;
  searchControl = new FormControl('');
  specializationControl = new FormControl('');
  loading = new BehaviorSubject<boolean>(true);
  error = new BehaviorSubject<string | null>(null);
  isAdmin$: Observable<boolean>;
  specializations: string[] = [];

  constructor(
    private doctorService: DoctorService,
    private seedService: SeedService,
    private authService: AuthService
  ) {
    this.isAdmin$ = this.authService.currentUser$.pipe(
      map(user => user?.role === UserRole.ADMIN)
    );

    const search$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged()
    );

    const specialization$ = this.specializationControl.valueChanges.pipe(
      startWith(''),
      distinctUntilChanged()
    );

    this.doctors$ = combineLatest([search$, specialization$]).pipe(
      switchMap(([searchTerm, specialization]) => {
        this.loading.next(true);
        this.error.next(null);
        return this.doctorService.getDoctors().pipe(
          map(doctors => {
            // Filtruj lekarzy
            let filteredDoctors = doctors;

            // Filtruj po wyszukiwaniu
            if (searchTerm) {
              const searchLower = searchTerm.toLowerCase();
              filteredDoctors = filteredDoctors.filter(doctor => 
                doctor.displayName?.toLowerCase().includes(searchLower) ||
                doctor.specialization?.toLowerCase().includes(searchLower) ||
                doctor.languages?.some(lang => lang.toLowerCase().includes(searchLower)) ||
                doctor.about?.toLowerCase().includes(searchLower)
              );
            }

            // Filtruj po specjalizacji
            if (specialization) {
              filteredDoctors = filteredDoctors.filter(doctor => 
                doctor.specialization === specialization
              );
            }

            return filteredDoctors;
          })
        );
      }),
      map(doctors => {
        this.loading.next(false);
        return doctors;
      })
    );
  }

  ngOnInit(): void {
    // Załaduj specjalizacje
    this.doctorService.getDoctors().pipe(
      map(doctors => {
        const specializations = new Set<string>();
        doctors.forEach(doctor => {
          if (doctor.specialization) {
            specializations.add(doctor.specialization);
          }
        });
        return Array.from(specializations).sort();
      })
    ).subscribe(specializations => {
      this.specializations = specializations;
    });

    // Obserwuj błędy
    this.doctors$.subscribe({
      error: (err) => {
        console.error('Error loading doctors:', err);
        this.error.next('Wystąpił błąd podczas ładowania listy lekarzy.');
        this.loading.next(false);
      }
    });
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.specializationControl.setValue('');
  }

  async seedDoctors() {
    try {
      this.loading.next(true);
      this.error.next(null);
      await this.seedService.seedDoctors();
      // Odśwież listę lekarzy
      this.clearFilters();
    } catch (error) {
      console.error('Error seeding doctors:', error);
      this.error.next('Wystąpił błąd podczas dodawania przykładowych lekarzy.');
    } finally {
      this.loading.next(false);
    }
  }
}
