import { Component, OnInit, OnDestroy } from '@angular/core';
import { CartService, CartItem } from '../../services/cart.service';
import { AppointmentService } from '../../services/appointment.service';
import { Subscription } from 'rxjs';
import { firstValueFrom } from 'rxjs';

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

  constructor(
    private cartService: CartService,
    private appointmentService: AppointmentService
  ) {}

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

  async removeItem(appointmentId: string): Promise<void> {
    try {
      await firstValueFrom(this.appointmentService.cancelAppointment(appointmentId));
      // Nie musimy wywoływać cartService.removeFromCart(appointmentId) 
      // ponieważ AppointmentService już to robi w cancelAppointment
    } catch (error) {
      console.error('Error removing appointment:', error);
      alert('Wystąpił błąd podczas usuwania wizyty. Spróbuj ponownie.');
    }
  }

  async clearCart(): Promise<void> {
    try {
      // Usuwamy każdą wizytę z bazy danych
      const cancelPromises = this.cartItems.map(item => 
        firstValueFrom(this.appointmentService.cancelAppointment(item.appointment.id!))
      );
      await Promise.all(cancelPromises);
      
      // Nie musimy wywoływać cartService.clearCart() 
      // ponieważ wszystkie wizyty zostały już usunięte przez cancelAppointment
    } catch (error) {
      console.error('Error clearing cart:', error);
      alert('Wystąpił błąd podczas czyszczenia koszyka. Spróbuj ponownie.');
    }
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
