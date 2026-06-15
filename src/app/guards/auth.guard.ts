import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (user) {
        const url = state.url;
        // Restrict admin routes to admin users
        if (url.startsWith('/admin') && user.role !== 'admin') {
          return router.createUrlTree(['/customer']);
        }
        // Restrict customer routes to customer users
        const isCustomerPath = url.startsWith('/customer') || 
                               url.startsWith('/security') || 
                               url.startsWith('/notifications') || 
                               url.startsWith('/help-center') || 
                               url.startsWith('/edit-profile') ||
                               url.startsWith('/rental-detail');
                               
        if (isCustomerPath && user.role !== 'customer') {
          return router.createUrlTree(['/admin']);
        }
        return true;
      }
      // If not logged in, redirect to login
      return router.createUrlTree(['/login']);
    })
  );
};
