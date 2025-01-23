import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router 
} from '@angular/router';
import { Observable, map, take, of } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private auth: Auth,
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.isAuthReady$.pipe(
      take(1),
      map(ready => {
        if (!ready) {
          // Poczekaj na inicjalizację auth
          return true;
        }

        const user = this.authService.getCurrentUser();
        const requiredRole = route.data['role'] as UserRole;

        // Jeśli użytkownik nie jest zalogowany
        if (!user) {
          console.log('User not logged in, redirecting to login');
          this.router.navigate(['/login'], {
            queryParams: {
              returnUrl: state.url,
              requiredRole: requiredRole
            }
          });
          return false;
        }

        // Jeśli użytkownik jest zbanowany
        if (user.banned) {
          console.log('User is banned, redirecting to banned page');
          this.router.navigate(['/banned']);
          return false;
        }

        // Jeśli ścieżka wymaga konkretnej roli
        if (requiredRole) {
          const hasRequiredRole = user.role === requiredRole || user.role === UserRole.ADMIN;
          
          if (!hasRequiredRole) {
            console.log(`User does not have required role: ${requiredRole}`);
            this.router.navigate(['/unauthorized'], {
              queryParams: {
                requiredRole: requiredRole,
                currentRole: user.role
              }
            });
            return false;
          }
        }

        // Użytkownik jest zalogowany i ma odpowiednie uprawnienia
        return true;
      })
    );
  }
}
