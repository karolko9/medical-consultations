import { Component, OnInit, OnDestroy } from '@angular/core';
import { CartService, CartItem } from '../../services/cart.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-reservation-cart',
  templateUrl: './reservation-cart.component.html',
  styleUrls: ['./reservation-cart.component.scss']
})
export class ReservationCartComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  totalPrice: number = 0;
  isProcessingPayment: boolean = false;
  private subscription: Subscription = new Subscription();

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.cartService.getItems().subscribe(items => {
        this.cartItems = items;
        this.totalPrice = this.cartService.getTotalPrice();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  removeItem(appointmentId: string): void {
    this.cartService.removeFromCart(appointmentId);
  }

  clearCart(): void {
    this.cartService.clearCart();
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  calculateDuration(start: Date | string, end: Date | string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60); // Duration in minutes
  }

  async processPayment() {
    this.isProcessingPayment = true;
    
    try {
      // Symulacja procesu płatności
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Sukces
      alert('Płatność zakończona sukcesem! Twoje wizyty zostały potwierdzone.');
      this.cartService.clearCart();
    } catch (error) {
      alert('Wystąpił błąd podczas przetwarzania płatności. Spróbuj ponownie.');
    } finally {
      this.isProcessingPayment = false;
    }
  }
}
