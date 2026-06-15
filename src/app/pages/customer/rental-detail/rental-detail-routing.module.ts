import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RentalDetailPage } from './rental-detail.page';

const routes: Routes = [
  {
    path: '',
    component: RentalDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RentalDetailPageRoutingModule {}
