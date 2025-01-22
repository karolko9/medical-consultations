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

  removeItem(appointmentId: string) {
    this.cartService.removeFromCart(appointmentId);
  }

  formatDate(date: Date): string {
    return format(date, 'dd.MM.yyyy HH:mm');
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
