import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { UserRole } from './models/user.model';
import { DoctorCalendarComponent } from './components/doctor/doctor-calendar/doctor-calendar.component';
import { DoctorAvailabilityComponent } from './components/doctor/doctor-availability/doctor-availability.component';
import { ReservationCartComponent } from './components/patient/reservation-cart/reservation-cart.component';
import { AppointmentHistoryComponent } from './components/patient/appointment-history/appointment-history.component';
import { UserManagementComponent } from './components/admin/user-management/user-management.component';
import { DoctorManagementComponent } from './components/admin/doctor-management/doctor-management.component';
import { DoctorListComponent } from './components/public/doctor-list/doctor-list.component';
import { DoctorDetailsComponent } from './components/public/doctor-details/doctor-details.component';

export const routes: Routes = [
  { path: '', redirectTo: '/doctors', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  
  // Doctor routes
  {
    path: 'doctor',
    canActivate: [AuthGuard],
    data: { role: UserRole.DOCTOR },
    children: [
      { path: 'calendar', component: DoctorCalendarComponent },
      { path: 'availability', component: DoctorAvailabilityComponent }
    ]
  },

  // Patient routes
  {
    path: 'patient',
    canActivate: [AuthGuard],
    data: { role: UserRole.PATIENT },
    children: [
      { path: 'appointments', component: ReservationCartComponent },
      { path: 'history', component: AppointmentHistoryComponent }
    ]
  },

  // Admin routes
  {
    path: 'admin',
    canActivate: [AuthGuard],
    data: { role: UserRole.ADMIN },
    children: [
      { path: 'users', component: UserManagementComponent },
      { path: 'doctors', component: DoctorManagementComponent }
    ]
  },

  // Public routes
  { path: 'doctors', component: DoctorListComponent },
  {
    path: 'doctors/:id',
    component: DoctorDetailsComponent,
    canActivate: [AuthGuard],
    data: { role: UserRole.PATIENT }
  },

  // Catch all route
  { path: '**', redirectTo: '/doctors' }
];
