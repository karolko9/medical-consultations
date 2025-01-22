import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DoctorCalendarComponent } from './components/doctor-calendar/doctor-calendar.component';
import { AvailabilityComponent } from './components/availability/availability.component';
import { CartPageComponent } from './pages/cart-page/cart-page.component';

const routes: Routes = [
  { path: '', redirectTo: '/calendar', pathMatch: 'full' },
  { path: 'calendar', component: DoctorCalendarComponent },
  { path: 'availability', component: AvailabilityComponent },
  { path: 'cart', component: CartPageComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
