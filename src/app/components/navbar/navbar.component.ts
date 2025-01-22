import { Component, OnInit } from '@angular/core';
import { CartService } from '../../services/cart.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  cartItemsCount$: Observable<number>;

  constructor(private cartService: CartService) {
    this.cartItemsCount$ = this.cartService.getItems().pipe(
      map(items => items.length)
    );
  }

  ngOnInit(): void {}
}
