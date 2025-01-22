import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Appointment, ConsultationType } from '../models/appointment.model';

export interface CartItem {
  appointment: Appointment;
  price: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems = new BehaviorSubject<CartItem[]>([]);
  
  constructor() {}

  getCartItems(): Observable<CartItem[]> {
    return this.cartItems.asObservable();
  }

  addToCart(appointment: Appointment): void {
    const price = this.calculatePrice(appointment);
    const currentItems = this.cartItems.value;
    this.cartItems.next([...currentItems, { appointment, price }]);
  }

  removeFromCart(appointmentId: string): void {
    const currentItems = this.cartItems.value;
    this.cartItems.next(currentItems.filter(item => item.appointment.id !== appointmentId));
  }

  clearCart(): void {
    this.cartItems.next([]);
  }

  getTotalPrice(): number {
    return this.cartItems.value.reduce((total, item) => total + item.price, 0);
  }

  private calculatePrice(appointment: Appointment): number {
    // Przykładowa logika obliczania ceny
    const basePrice = 100; // Podstawowa cena wizyty
    const durationInHours = (appointment.end.getTime() - appointment.start.getTime()) / (1000 * 60 * 60);
    
    let price = basePrice * durationInHours;

    // Dodatkowa opłata za typ konsultacji
    switch (appointment.consultationType) {
      case ConsultationType.FIRST_VISIT:
        price *= 1.5; // +50% za pierwszą wizytę
        break;
      case ConsultationType.FOLLOW_UP:
        price *= 1.2; // +20% za wizytę kontrolną
        break;
      case ConsultationType.PRESCRIPTION:
        price *= 0.8; // -20% za receptę
        break;
    }

    return Math.round(price); // Zaokrąglamy do pełnych złotych
  }
}
