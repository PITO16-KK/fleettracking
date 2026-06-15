import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadChildren: () => import('../home/home.module').then(m => m.HomePageModule)
      },
      {
        path: 'rentals',
        loadChildren: () => import('../rentals/rentals.module').then(m => m.RentalsPageModule)
      },
      {
        path: 'profile',
        loadChildren: () => import('../profile/profile.module').then(m => m.ProfilePageModule)
      },
      {
        path: 'car-list',
        loadChildren: () => import('../car-list/car-list.module').then(m => m.CarListPageModule)
      },
      {
        path: 'car/:id',
        loadChildren: () => import('../car-detail/car-detail.module').then(m => m.CarDetailPageModule)
      },
      {
        path: 'booking/:id',
        loadChildren: () => import('../booking/booking.module').then(m => m.BookingPageModule)
      },
      {
        path: 'payment/:id',
        loadChildren: () => import('../payment/payment.module').then(m => m.PaymentPageModule)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsPageRoutingModule {}
