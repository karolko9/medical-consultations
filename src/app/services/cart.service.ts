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
  private readonly CART_STORAGE_KEY = 'medical-cart';
  private items: CartItem[] = [];
  private itemsSubject = new BehaviorSubject<CartItem[]>([]);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const savedCart = localStorage.getItem(this.CART_STORAGE_KEY);
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        // Konwertuj daty z powrotem na obiekty Date
        this.items = parsedCart.map((item: CartItem) => ({
          ...item,
          appointment: {
            ...item.appointment,
            start: new Date(item.appointment.start),
            end: new Date(item.appointment.end)
          }
        }));
        this.itemsSubject.next(this.items);
      } catch (error) {
        console.error('Error loading cart from storage:', error);
        this.items = [];
        this.itemsSubject.next(this.items);
      }
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(this.items));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }

  getItems(): Observable<CartItem[]> {
    return this.itemsSubject.asObservable();
  }

  // Alias dla kompatybilności wstecznej
  getCartItems(): Observable<CartItem[]> {
    return this.getItems();
  }

  addItem(appointment: Appointment) {
    const price = this.calculatePrice(appointment);
    this.items.push({ appointment, price });
    this.itemsSubject.next(this.items);
    this.saveToStorage();
  }

  // Alias dla kompatybilności wstecznej
  addToCart(appointment: Appointment) {
    this.addItem(appointment);
  }

  removeItem(appointment: Appointment) {
    const index = this.items.findIndex(item => item.appointment === appointment);
    if (index > -1) {
      this.items.splice(index, 1);
      this.itemsSubject.next(this.items);
      this.saveToStorage();
    }
  }

  // Alias dla kompatybilności wstecznej
  removeFromCart(appointmentId: string) {
    const index = this.items.findIndex(item => item.appointment.id === appointmentId);
    if (index > -1) {
      this.items.splice(index, 1);
      this.itemsSubject.next(this.items);
      this.saveToStorage();
    }
  }

  getTotalPrice(): number {
    return this.items.reduce((total, item) => total + item.price, 0);
  }

  private calculatePrice(appointment: Appointment): number {
    const start = new Date(appointment.start);
    const end = new Date(appointment.end);
    const durationInHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    let basePrice = 0;

    switch (appointment.consultationType) {
      case ConsultationType.FIRST_VISIT:
        basePrice = 200;
        break;
      case ConsultationType.FOLLOW_UP:
        basePrice = 150;
        break;
      case ConsultationType.PRESCRIPTION:
        basePrice = 80;
        break;
      case ConsultationType.CONSULTATION:
        basePrice = 120;
        break;
      default:
        basePrice = 100;
    }

    return basePrice * durationInHours;
  }

  clearCart() {
    this.items = [];
    this.itemsSubject.next(this.items);
    localStorage.removeItem(this.CART_STORAGE_KEY);
  }
}
