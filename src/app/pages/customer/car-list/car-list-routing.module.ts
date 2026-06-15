import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CarListPage } from './car-list.page';

const routes: Routes = [
  {
    path: '',
    component: CarListPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CarListPageRoutingModule {}
