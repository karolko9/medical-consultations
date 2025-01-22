import { Component, OnInit, OnDestroy } from '@angular/core';
import { CartService } from '../../services/cart.service';
import { map } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  cartItemsCount$: Observable<number>;
  private subscription: Subscription = new Subscription();

  constructor(private cartService: CartService) {
    this.cartItemsCount$ = this.cartService.getCartItems().pipe(
      map(items => items.length)
    );
  }

  ngOnInit(): void {
    // Możemy dodać dodatkowe subskrypcje jeśli będą potrzebne
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
