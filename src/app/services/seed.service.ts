import { Injectable } from '@angular/core';
import { Database, ref, set } from '@angular/fire/database';
import { DoctorProfile, UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class SeedService {
  constructor(private db: Database) {}

  async seedDoctors() {
    const doctors: DoctorProfile[] = [
      {
        uid: 'doctor1',
        email: 'kardiolog@example.com',
        displayName: 'dr Anna Kowalska',
        role: UserRole.DOCTOR,
        specialization: 'Kardiologia',
        education: 'Uniwersytet Medyczny w Warszawie',
        experience: '15 lat doświadczenia',
        about: 'Specjalizuję się w diagnostyce i leczeniu chorób serca. Wieloletnie doświadczenie w prowadzeniu pacjentów z nadciśnieniem tętniczym i chorobą wieńcową.',
        languages: ['polski', 'angielski', 'niemiecki'],
        rating: 4.8,
        reviewsCount: 124,
        consultationPrice: 200,
        photoURL: 'https://example.com/photos/doctor1.jpg'
      },
      {
        uid: 'doctor2',
        email: 'pediatra@example.com',
        displayName: 'dr Marek Nowak',
        role: UserRole.DOCTOR,
        specialization: 'Pediatria',
        education: 'Uniwersytet Medyczny w Poznaniu',
        experience: '10 lat doświadczenia',
        about: 'Pediatra z pasją do pracy z dziećmi. Specjalizuję się w diagnostyce i leczeniu chorób wieku dziecięcego oraz profilaktyce zdrowotnej.',
        languages: ['polski', 'angielski'],
        rating: 4.9,
        reviewsCount: 89,
        consultationPrice: 180,
        photoURL: 'https://example.com/photos/doctor2.jpg'
      },
      {
        uid: 'doctor3',
        email: 'dermatolog@example.com',
        displayName: 'dr Maria Wiśniewska',
        role: UserRole.DOCTOR,
        specialization: 'Dermatologia',
        education: 'Uniwersytet Medyczny we Wrocławiu',
        experience: '8 lat doświadczenia',
        about: 'Dermatolog z doświadczeniem w leczeniu chorób skóry, włosów i paznokci. Specjalizuję się w dermatologii estetycznej i leczeniu trądziku.',
        languages: ['polski', 'angielski', 'francuski'],
        rating: 4.7,
        reviewsCount: 67,
        consultationPrice: 190,
        photoURL: 'https://example.com/photos/doctor3.jpg'
      }
    ];

    try {
      for (const doctor of doctors) {
        const doctorRef = ref(this.db, `doctors/${doctor.uid}`);
        await set(doctorRef, doctor);
      }
      console.log('Doctors seeded successfully');
    } catch (error) {
      console.error('Error seeding doctors:', error);
      throw error;
    }
  }
}
