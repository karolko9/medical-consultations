import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Appointment, ConsultationType } from '../models/appointment.model';
import { Database, ref, set, push, remove, onValue } from '@angular/fire/database';

export interface CartItem {
  id?: string;
  appointment: Appointment;
  price: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems = new BehaviorSubject<CartItem[]>([]);
  
  constructor(private db: Database) {
    this.loadCartFromFirebase();
  }

  private loadCartFromFirebase(): void {
    console.log('Loading cart from Firebase...');
    const cartRef = ref(this.db, 'cart');
    onValue(cartRef, (snapshot) => {
      console.log('Raw Firebase data:', snapshot.val());
      const data = snapshot.val();
      const items: CartItem[] = [];
      if (data) {
        Object.keys(data).forEach(key => {
          const item = data[key];
          console.log('Processing item:', item);
          items.push({
            ...item,
            id: key,
            appointment: {
              ...item.appointment,
              start: new Date(item.appointment.start),
              end: new Date(item.appointment.end)
            }
          });
        });
      }
      console.log('Processed cart items:', items);
      this.cartItems.next(items);
    });
  }

  getCartItems(): Observable<CartItem[]> {
    return this.cartItems.asObservable();
  }

  async addToCart(appointment: Appointment): Promise<void> {
    console.log('Adding to cart:', appointment);
    if (!appointment.id) {
      throw new Error('Appointment must have an ID before adding to cart');
    }
    const price = this.calculatePrice(appointment);
    const cartRef = ref(this.db, 'cart');
    const newItem: CartItem = {
      appointment: {
        ...appointment,
        start: appointment.start instanceof Date ? appointment.start.toISOString() : appointment.start,
        end: appointment.end instanceof Date ? appointment.end.toISOString() : appointment.end
      },
      price
    };
    console.log('Saving item to Firebase:', newItem);
    try {
      await push(cartRef, newItem);
      console.log('Successfully saved to Firebase');
    } catch (error) {
      console.error('Error saving to Firebase:', error);
      throw error;
    }
  }

  async removeFromCart(appointmentId: string): Promise<void> {
    const currentItems = this.cartItems.value;
    const itemToRemove = currentItems.find(item => item.appointment.id === appointmentId);
    if (itemToRemove && itemToRemove.id) {
      const cartItemRef = ref(this.db, `cart/${itemToRemove.id}`);
      await remove(cartItemRef);
    }
  }

  async clearCart(): Promise<void> {
    const cartRef = ref(this.db, 'cart');
    await remove(cartRef);
  }

  getTotalPrice(): number {
    return this.cartItems.value.reduce((total, item) => total + item.price, 0);
  }

  private calculatePrice(appointment: Appointment): number {
    const basePrice = 100; // Podstawowa cena wizyty
    const start = appointment.start instanceof Date ? appointment.start : new Date(appointment.start);
    const end = appointment.end instanceof Date ? appointment.end : new Date(appointment.end);
    const durationInHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    let price = basePrice * durationInHours;

    // Dodatkowa opłata za typ konsultacji
    switch (appointment.consultationType) {
      case ConsultationType.FIRST_VISIT:
        price *= 1.5; // +50% za pierwszą wizytę
        break;
      case ConsultationType.FOLLOW_UP:
        price *= 1.2; // +20% za wizytę kontrolną
        break;
      case ConsultationType.CONSULTATION:
        // Standardowa cena
        break;
      case ConsultationType.PRESCRIPTION:
        price *= 0.8; // -20% za receptę
        break;
    }

    return price;
  }
}
