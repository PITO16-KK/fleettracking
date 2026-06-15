import { Component, OnInit, OnDestroy, Optional } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MockDataService, Rental } from '../../../services/mock-data.service';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-rental-detail',
  templateUrl: './rental-detail.page.html',
  styleUrls: ['./rental-detail.page.scss'],
  standalone: false
})
export class RentalDetailPage implements OnInit, OnDestroy {
  rental?: Rental;
  isGpsTracking = false;
  private watchId: any = null;

  constructor(
    @Optional() private route: ActivatedRoute | null,
    private mockData: MockDataService,
    private apiService: ApiService,
    private authService: AuthService
  ) { }

  downloadInvoice() {
    if (!this.rental) return;
    const token = this.authService.getToken();
    const cleanId = this.rental.id.replace('#', '');
    let baseUrl = environment.apiUrl;
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.substring(0, baseUrl.length - 4);
    }
    const invoiceUrl = `${baseUrl}/payment/${cleanId}/invoice?token=${token || ''}`;
    window.open(invoiceUrl, '_system');
  }

  ngOnInit() {
    const id = this.route?.snapshot?.paramMap.get('id');
    if (id) {
      this.mockData.getRentalById(id).subscribe(data => {
        this.rental = data;
      });
    }
  }

  toggleGpsTracking(event: any) {
    if (this.isGpsTracking) {
      this.startTracking();
    } else {
      this.stopTracking();
    }
  }

  startTracking() {
    if (!navigator.geolocation) {
      alert('Fitur GPS tidak didukung di perangkat ini.');
      this.isGpsTracking = false;
      return;
    }

    const sendCoords = (lat: number, lng: number) => {
      const carId = this.rental?.carId;
      if (carId) {
        this.apiService.postData('gps/update', {
          car_id: parseInt(carId),
          latitude: lat,
          longitude: lng
        }).subscribe({
          next: (res) => console.log('Posisi GPS berhasil diupdate:', res),
          error: (err) => console.error('Gagal mengupdate posisi GPS:', err)
        });
      }
    };

    // Get initial position immediately
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendCoords(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.warn('Initial GPS query failed, fallback to watch:', error);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 30000,
        timeout: 5000
      }
    );

    const options = {
      enableHighAccuracy: false,
      maximumAge: 30000,
      timeout: 15000
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        sendCoords(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Error membaca GPS:', error);
      },
      options
    );
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isGpsTracking = false;
  }

  ngOnDestroy() {
    this.stopTracking();
  }
}
