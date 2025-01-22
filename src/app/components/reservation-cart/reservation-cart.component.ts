import { Component, OnInit, OnDestroy } from '@angular/core';
import { CartService, CartItem } from '../../services/cart.service';
import { Subject, takeUntil } from 'rxjs';
import { format } from 'date-fns';

@Component({
  selector: 'app-reservation-cart',
  templateUrl: './reservation-cart.component.html',
  styleUrls: ['./reservation-cart.component.scss']
})
export class ReservationCartComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  totalPrice: number = 0;
  isProcessingPayment: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(private cartService: CartService) {}

  ngOnInit() {
    this.cartService.getCartItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.cartItems = items;
        this.totalPrice = this.cartService.getTotalPrice();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async removeItem(appointmentId: string) {
    try {
      await this.cartService.removeFromCart(appointmentId);
    } catch (error) {
      console.error('Error removing item from cart:', error);
    }
  }

  formatDate(date: Date | string): string {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'dd.MM.yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }

  async processPayment() {
    this.isProcessingPayment = true;
    
    try {
      // Symulacja procesu płatności
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Sukces
      await this.cartService.clearCart();
      alert('Płatność zakończona sukcesem! Twoje wizyty zostały potwierdzone.');
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Wystąpił błąd podczas przetwarzania płatności. Spróbuj ponownie.');
    } finally {
      this.isProcessingPayment = false;
    }
  }
}
