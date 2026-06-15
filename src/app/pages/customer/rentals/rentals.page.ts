import { Component, OnInit, OnDestroy } from '@angular/core';
import { MockDataService, Rental } from '../../../services/mock-data.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-rentals',
  templateUrl: './rentals.page.html',
  styleUrls: ['./rentals.page.scss'],
  standalone: false
})
export class RentalsPage implements OnInit, OnDestroy {
  filter: string = 'all';
  allRentals: Rental[] = [];
  filteredRentals: Rental[] = [];
  gpsWatchers: { [carId: string]: any } = {};

  // Rating Modal state
  showRatingModal: boolean = false;
  selectedRentalForRating: Rental | null = null;
  ratingValue: number = 5;
  reviewText: string = '';

  constructor(
    private mockData: MockDataService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    // Subscribe to the shared BehaviorSubject state.
    // Do NOT call loadRentals() here — the state already contains the
    // newly-created rental added by createRental(). Fetching from backend
    // again risks overwriting it before the server commits the transaction.
    this.mockData.getRentals().subscribe(data => {
      this.allRentals = data;
      this.updateFilter();
    });
  }

  updateFilter() {
    if (this.filter === 'all') {
      this.filteredRentals = this.allRentals;
    } else {
      this.filteredRentals = this.allRentals.filter(r => r.status.toLowerCase() === this.filter);
    }
  }

  // Pull-to-refresh: explicitly syncs from backend
  doRefresh(event: any) {
    this.mockData.loadRentals();
    setTimeout(() => {
      event.target.complete();
    }, 1500);
  }

  openRatingModal(rental: Rental) {
    this.selectedRentalForRating = rental;
    this.ratingValue = 5;
    this.reviewText = '';
    this.showRatingModal = true;
  }

  async submitRating() {
    if (this.selectedRentalForRating) {
      this.selectedRentalForRating.isRated = true;

      const toast = await this.toastCtrl.create({
        message: 'Thank you! Your rating and review have been submitted successfully.',
        duration: 3000,
        color: 'success',
        position: 'bottom'
      });
      toast.present();
    }
    this.showRatingModal = false;
  }

  isGpsActive(carId: string): boolean {
    return !!this.gpsWatchers[carId];
  }

  toggleGps(carId: string, event: any) {
    const isChecked = event.detail.checked;
    if (isChecked) {
      this.startGpsTracking(carId);
    } else {
      this.stopGpsTracking(carId);
    }
  }

  startGpsTracking(carId: string) {
    if (this.gpsWatchers[carId]) return;

    if (!navigator.geolocation) {
      this.showToast('GPS is not supported by your device.', 'danger');
      return;
    }

    const sendCoords = (lat: number, lng: number) => {
      this.mockData.updateGpsLocation(carId, lat, lng).subscribe({
        next: (res) => console.log(`GPS updated for car ${carId}:`, res),
        error: (err) => console.error(`Failed to update GPS for car ${carId}:`, err)
      });
    };

    // Show initial toast
    this.showToast('📡 Connecting GPS...');

    // Get initial position immediately
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendCoords(position.coords.latitude, position.coords.longitude);
        this.showToast('📡 GPS Active - Position sent successfully', 'success');
      },
      (error) => {
        console.warn('Initial GPS query failed, fallback to watch:', error);
      },
      { enableHighAccuracy: false, timeout: 5000 }
    );

    // Watch position
    this.gpsWatchers[carId] = navigator.geolocation.watchPosition(
      (position) => {
        sendCoords(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('GPS watch error:', error);
        this.showToast('⚠️ Failed to fetch GPS: ' + error.message, 'danger');
      },
      { enableHighAccuracy: false, timeout: 15000 }
    );
  }

  stopGpsTracking(carId: string) {
    if (this.gpsWatchers[carId]) {
      navigator.geolocation.clearWatch(this.gpsWatchers[carId]);
      delete this.gpsWatchers[carId];
      this.showToast('📡 GPS Disabled');
    }
  }

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    toast.present();
  }

  ngOnDestroy() {
    Object.keys(this.gpsWatchers).forEach(carId => {
      if (this.gpsWatchers[carId]) {
        navigator.geolocation.clearWatch(this.gpsWatchers[carId]);
      }
    });
  }
}
