import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MockDataService, Car } from '../../../services/mock-data.service';
import { AuthService, User } from '../../../services/auth.service';
import { Geolocation, PermissionStatus } from '@capacitor/geolocation';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  categories = ['All', 'Sedan', 'SUV', 'MPV', 'Luxury'];
  selectedCategory = 'All';
  searchTerm = '';
  cars: Car[] = [];
  featuredCars: Car[] = [];
  nearbyCars: Car[] = [];
  user: User | null = null;

  showChatbot = false;
  userMessage = '';
  isChatbotLoading = false;
  chatbotMessages: Array<{ role: 'user' | 'model'; content: string }> = [
    { role: 'model', content: 'Halo! Saya Asisten AI Roamie. Ada yang bisa saya bantu mengenai persyaratan sewa, tata cara pembayaran, atau kendala pemesanan mobil Anda?' }
  ];

  // Default fallback: Jakarta
  userLocation = {
    latitude: -6.200000,
    longitude: 106.816666
  };

  constructor(
    private mockData: MockDataService,
    private authService: AuthService,
    private router: Router,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.tryAcquireLocation();

    this.mockData.getCars().subscribe(data => {
      this.cars = data;
      this.applyFilters();
    });

    this.authService.currentUser$.subscribe(u => {
      this.user = u;
    });
  }

  /**
   * Requests Android runtime location permission via Capacitor Geolocation,
   * then fetches the current position. Falls back to Jakarta coords silently.
   */
  private async tryAcquireLocation() {
    try {
      // Step 1: Check current permission status
      let status: PermissionStatus = await Geolocation.checkPermissions();

      // Step 2: If not granted, request from user
      if (status.location !== 'granted') {
        status = await Geolocation.requestPermissions();
      }

      if (status.location !== 'granted') {
        // User denied — keep fallback location, show a soft toast
        this.showLocationDeniedToast();
        return;
      }

      // Step 3: Get position
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      this.userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      this.applyFilters();
    } catch (err: any) {
      // Geolocation unavailable on this device/emulator — fallback silently
      console.warn('[GPS] Unavailable or timed out:', err?.message ?? err);
    }
  }

  private async showLocationDeniedToast() {
    const toast = await this.toastCtrl.create({
      message: '📍 Izin lokasi ditolak. Mobil ditampilkan tanpa urutan jarak.',
      duration: 3500,
      position: 'bottom',
      color: 'warning',
      cssClass: 'exit-toast'
    });
    await toast.present();
  }

  selectCategory(cat: string) {
    this.selectedCategory = cat;
    this.applyFilters();
  }

  handleSearch(event: any) {
    this.searchTerm = event.target.value;
    this.applyFilters();
  }

  applyFilters() {
    let result = this.cars;

    if (this.selectedCategory !== 'All') {
      result = result.filter(c => c.type === this.selectedCategory);
    }

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(c => 
        c.brand.toLowerCase().includes(term) || 
        c.model.toLowerCase().includes(term)
      );
    }

    this.featuredCars = result;
    this.nearbyCars = this.getNearestCars(this.cars).slice(0, 4);
  }

  private getNearestCars(carList: Car[]) {
    return carList.slice().sort((a, b) => {
      const distA = this.computeDistance(a);
      const distB = this.computeDistance(b);
      return distA - distB;
    });
  }

  private computeDistance(car: Car): number {
    if (car.latitude == null || car.longitude == null) {
      return Number.MAX_VALUE;
    }
    return this.haversine(
      this.userLocation.latitude,
      this.userLocation.longitude,
      car.latitude,
      car.longitude
    );
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const earthRadiusKm = 6371;
    return earthRadiusKm * c;
  }

  seeAll() {
    this.router.navigate(['/customer/car-list'], {
      queryParams: {
        category: this.selectedCategory,
        search: this.searchTerm
      }
    });
  }

  toggleChatbot() {
    this.showChatbot = !this.showChatbot;
    if (this.showChatbot) {
      this.scrollToBottom();
    }
  }

  closeChatbot() {
    this.showChatbot = false;
  }

  sendChatbotMessage() {
    const text = this.userMessage.trim();
    if (!text) return;

    this.userMessage = '';
    this.chatbotMessages.push({ role: 'user', content: text });
    this.isChatbotLoading = true;
    this.scrollToBottom();

    this.mockData.sendChatbotMessage(this.chatbotMessages).subscribe({
      next: (res) => {
        this.isChatbotLoading = false;
        if (res && res.success) {
          this.chatbotMessages.push({ role: 'model', content: res.reply });
        } else {
          this.chatbotMessages.push({ role: 'model', content: res.message || 'Maaf, terjadi kesalahan pada sistem.' });
        }
        this.scrollToBottom();
      },
      error: (err) => {
        this.isChatbotLoading = false;
        console.error('Chatbot error:', err);
        this.chatbotMessages.push({ role: 'model', content: 'Maaf, terjadi kesalahan koneksi. Silakan coba kembali.' });
        this.scrollToBottom();
      }
    });
  }

  private scrollToBottom() {
    setTimeout(() => {
      const messageContainer = document.getElementById('chatbotMessagesHome');
      if (messageContainer) {
        messageContainer.scrollTop = messageContainer.scrollHeight;
      }
    }, 100);
  }
}
