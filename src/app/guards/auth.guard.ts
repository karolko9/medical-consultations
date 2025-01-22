import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        // Check if route requires specific role
        const requiredRole = next.data['role'] as UserRole;
        
        if (!user) {
          this.router.navigate(['/login'], { queryParams: { returnUrl: state.url }});
          return false;
        }

        if (requiredRole && user.role !== requiredRole) {
          this.router.navigate(['/']);
          return false;
        }

        if (user.banned) {
          this.router.navigate(['/banned']);
          return false;
        }

        return true;
      })
    );
  }
}
