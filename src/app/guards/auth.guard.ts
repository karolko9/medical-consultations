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
        const requiredRole = next.data['role'] as UserRole;
        
        // If no user is logged in
        if (!user) {
          // Store the attempted URL for redirecting after login
          this.router.navigate(['/login'], { 
            queryParams: { 
              returnUrl: state.url,
              requiredRole: requiredRole // Pass required role to show appropriate message
            }
          });
          return false;
        }

        // If user is banned
        if (user.banned) {
          this.router.navigate(['/banned']);
          return false;
        }

        // If route requires specific role
        if (requiredRole) {
          // Check if user has required role or is an ADMIN (who has access to everything)
          const hasRequiredRole = user.role === requiredRole || user.role === UserRole.ADMIN;
          
          if (!hasRequiredRole) {
            this.router.navigate(['/unauthorized'], { 
              queryParams: { 
                requiredRole: requiredRole,
                currentRole: user.role 
              }
            });
            return false;
          }
        }

        // User is authenticated and authorized
        return true;
      })
    );
  }
}
