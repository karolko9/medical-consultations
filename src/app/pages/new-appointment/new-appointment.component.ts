import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { DoctorProfile } from '../../models/user.model';
import { DoctorService } from '../../services/doctor.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-new-appointment',
  templateUrl: './new-appointment.component.html',
  styleUrls: ['./new-appointment.component.scss']
})
export class NewAppointmentComponent implements OnInit {
  doctor$: Observable<DoctorProfile | null>;
  selectedDate: Date = new Date();
  showAppointmentForm = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private doctorService: DoctorService,
    private authService: AuthService
  ) {
    const doctorId = this.route.snapshot.paramMap.get('doctorId');
    if (!doctorId) {
      this.error = 'Nie znaleziono lekarza';
      this.doctor$ = new Observable<null>();
      return;
    }
    this.doctor$ = this.doctorService.getDoctorById(doctorId);
  }

  ngOnInit(): void {
    // Check if user is authenticated
    this.authService.currentUser$.subscribe(user => {
      if (!user) {
        this.router.navigate(['/login'], { 
          queryParams: { 
            returnUrl: this.router.url,
            message: 'Musisz być zalogowany, aby umówić wizytę'
          }
        });
      }
    });
  }

  onDateSelected(date: Date) {
    this.selectedDate = date;
    this.showAppointmentForm = true;
  }

  onAppointmentCreated() {
    this.router.navigate(['/appointments']);
  }

  onFormClosed() {
    this.showAppointmentForm = false;
  }
}
