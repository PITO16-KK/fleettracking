import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RentalDetailPageRoutingModule } from './rental-detail-routing.module';

import { RentalDetailPage } from './rental-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RentalDetailPageRoutingModule
  ],
  declarations: [RentalDetailPage]
})
export class RentalDetailPageModule {}
