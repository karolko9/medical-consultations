import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservationCartComponent } from './reservation-cart.component';

describe('ReservationCartComponent', () => {
  let component: ReservationCartComponent;
  let fixture: ComponentFixture<ReservationCartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservationCartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReservationCartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
