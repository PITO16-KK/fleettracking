import { Component, OnInit } from '@angular/core';
import { MockDataService, Car } from '../../../services/mock-data.service';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-cars',
  templateUrl: './cars.page.html',
  styleUrls: ['./cars.page.scss'],
  standalone: false
})
export class CarsPage implements OnInit {
  cars: Car[] = [];

  constructor(
    private mockData: MockDataService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.mockData.getCars().subscribe(data => {
      this.cars = data;
    });
  }

  async addCar() {
    const alert = await this.alertCtrl.create({
      header: 'Add New Car',
      inputs: [
        { name: 'brand', type: 'text', placeholder: 'Brand' },
        { name: 'name', type: 'text', placeholder: 'Model' },
        { name: 'plate', type: 'text', placeholder: 'Plate Number' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Save',
          handler: async () => {
            const toast = await this.toastCtrl.create({
              message: 'Car added successfully (Mock)',
              duration: 2000,
              color: 'success'
            });
            toast.present();
          }
        }
      ]
    });
    await alert.present();
  }
}
