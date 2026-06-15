import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (user) {
        // If already logged in, redirect to respective homepage
        if (user.role === 'admin') {
          return router.createUrlTree(['/admin']);
        } else {
          return router.createUrlTree(['/customer']);
        }
      }
      return true;
    })
  );
};
