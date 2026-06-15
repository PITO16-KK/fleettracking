import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule),
    canActivate: [guestGuard]
  },
  {
    path: 'customer',
    loadChildren: () => import('./pages/customer/tabs/tabs.module').then( m => m.TabsPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadChildren: () => import('./pages/admin/dashboard/dashboard.module').then( m => m.DashboardPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'admin/cars',
    loadChildren: () => import('./pages/admin/cars/cars.module').then( m => m.CarsPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'admin/rentals',
    loadChildren: () => import('./pages/admin/rentals/rentals.module').then( m => m.RentalsPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'admin/tracking',
    loadChildren: () => import('./pages/admin/tracking/tracking.module').then( m => m.TrackingPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'admin/history',
    loadChildren: () => import('./pages/admin/history/history.module').then( m => m.HistoryPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'edit-profile',
    loadChildren: () => import('./pages/customer/edit-profile/edit-profile.module').then( m => m.EditProfilePageModule),
    canActivate: [authGuard]
  },
  {
    path: 'notifications',
    loadChildren: () => import('./pages/customer/notifications/notifications.module').then( m => m.NotificationsPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'security',
    loadChildren: () => import('./pages/customer/security/security.module').then( m => m.SecurityPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'help-center',
    loadChildren: () => import('./pages/customer/help-center/help-center.module').then( m => m.HelpCenterPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'rental-detail/:id',
    loadChildren: () => import('./pages/customer/rental-detail/rental-detail.module').then( m => m.RentalDetailPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'not-found',
    loadChildren: () => import('./pages/not-found/not-found.module').then( m => m.NotFoundPageModule)
  },
  {
    path: 'welcome',
    loadChildren: () => import('./pages/welcome/welcome.module').then( m => m.WelcomePageModule)
  },
  {
    path: '**',
    loadChildren: () => import('./pages/not-found/not-found.module').then( m => m.NotFoundPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
