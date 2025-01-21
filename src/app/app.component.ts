import { Component } from '@angular/core';
import { DoctorCalendarComponent } from './components/doctor-calendar/doctor-calendar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DoctorCalendarComponent],
  template: `
    <div class="app-container">
      <header class="app-header">
        <h1>Medical Consultations</h1>
      </header>
      <main class="app-content">
        <app-doctor-calendar></app-doctor-calendar>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .app-header {
      background-color: #2c3e50;
      color: white;
      padding: 1rem;
      text-align: center;
    }
    
    .app-content {
      flex: 1;
      padding: 20px;
      background-color: #f5f6fa;
    }
  `]
})
export class AppComponent {
  title = 'Medical Consultations';
}
