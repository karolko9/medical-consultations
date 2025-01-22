import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { User, UserRole } from '../../models/user.model';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  cartItemsCount$: Observable<number>;
  currentUser$: Observable<User | null>;
  isAdmin$: Observable<boolean>;
  isDoctor$: Observable<boolean>;
  isPatient$: Observable<boolean>;

  constructor(
    private cartService: CartService,
    private authService: AuthService
  ) {
    this.cartItemsCount$ = this.cartService.getCartItemsCount();
    this.currentUser$ = this.authService.currentUser$;
    
    // Role-based observables
    this.isAdmin$ = this.currentUser$.pipe(
      map((user: User | null) => user?.role === UserRole.ADMIN)
    );
    
    this.isDoctor$ = this.currentUser$.pipe(
      map((user: User | null) => user?.role === UserRole.DOCTOR)
    );
    
    this.isPatient$ = this.currentUser$.pipe(
      map((user: User | null) => user?.role === UserRole.PATIENT)
    );
  }

  ngOnInit(): void {}
}
