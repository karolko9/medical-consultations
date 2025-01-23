import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DoctorCalendarComponent } from './components/doctor-calendar/doctor-calendar.component';
import { AvailabilityComponent } from './components/availability/availability.component';
import { ReservationCartComponent } from './components/reservation-cart/reservation-cart.component';
import { CartPageComponent } from './pages/cart-page/cart-page.component';
import { PersistenceSettingsComponent } from './components/persistence-settings/persistence-settings.component';
import { DoctorListComponent } from './components/doctor-list/doctor-list.component';
import { UnauthorizedComponent } from './components/unauthorized/unauthorized.component';
import { UserRole } from './models/user.model';

const routes: Routes = [
  // Public routes
  { path: '', redirectTo: '/doctors', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'doctors', component: DoctorListComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },
  
  // Patient routes
  { 
    path: 'patient',
    canActivate: [AuthGuard],
    data: { role: UserRole.PATIENT },
    children: [
      { path: 'appointments', component: ReservationCartComponent },
      { path: 'cart', component: CartPageComponent }
    ]
  },
  
  // Doctor routes
  {
    path: 'doctor',
    canActivate: [AuthGuard],
    data: { role: UserRole.DOCTOR },
    children: [
      { path: 'calendar', component: DoctorCalendarComponent },
      { path: 'availability', component: AvailabilityComponent }
    ]
  },

  // Admin routes
  {
    path: 'admin',
    canActivate: [AuthGuard],
    data: { role: UserRole.ADMIN },
    children: [
      { path: 'persistence', component: PersistenceSettingsComponent }
    ]
  },

  // Fallback route
  { path: '**', redirectTo: '/doctors' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
