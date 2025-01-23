import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { User, UserRole } from '../../models/user.model';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  isPatient$: Observable<boolean>;
  isDoctor$: Observable<boolean>;
  isAdmin$: Observable<boolean>;
  cartItemsCount$: Observable<number>;

  constructor(
    private authService: AuthService,
    private cartService: CartService
  ) {
    this.isPatient$ = this.authService.currentUser$.pipe(
      map(user => user?.role === UserRole.PATIENT)
    );

    this.isDoctor$ = this.authService.currentUser$.pipe(
      map(user => user?.role === UserRole.DOCTOR)
    );

    this.isAdmin$ = this.authService.currentUser$.pipe(
      map(user => user?.role === UserRole.ADMIN)
    );

    this.cartItemsCount$ = this.cartService.getCartItemsCount();
  }
}
