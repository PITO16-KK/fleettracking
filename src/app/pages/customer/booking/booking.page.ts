import { Component, OnInit, Optional } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MockDataService, Car } from '../../../services/mock-data.service';
import { MidtransService, CustomerDetails } from '../../../services/midtrans.service';
import { AuthService } from '../../../services/auth.service';
import { ToastController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.page.html',
  styleUrls: ['./booking.page.scss'],
  standalone: false
})
export class BookingPage implements OnInit {
  car?: Car;
  pickupDate: string = new Date().toISOString();
  pickupTime: string = new Date().toISOString();
  duration: number = 1;
  serviceFee: number = 50000;
  isProcessing: boolean = false;

  // --- Payment Method Selection ---
  selectedPaymentMethod: 'midtrans' = 'midtrans';

  // --- Midtrans Simulator Modal State ---
  showMidtransModal: boolean = false;
  midtransStep: 'channels' | 'va_details' | 'qris_details' | 'card_details' | 'success' = 'channels';
  
  // Virtual Account selection
  selectedBank: 'bca' | 'mandiri' | 'bni' | 'bri' = 'bca';
  vaNumber: string = '';

  // Credit Card Form
  cardNumber: string = '';
  cardExpiry: string = '';
  cardCvv: string = '';
  showOtpModal: boolean = false;
  otpCode: string = '';

  // Selected sub-method for final record
  selectedSubMethod: string = '';
  paymentToken: string = '';

  constructor(
    @Optional() private route: ActivatedRoute | null,
    private mockData: MockDataService,
    private midtransService: MidtransService,
    private authService: AuthService,
    private toastCtrl: ToastController,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    const id = this.route?.snapshot?.paramMap.get('id');
    if (id) {
      this.mockData.getCarById(id).subscribe(data => {
        this.car = data;
      });
    }
  }

  get subtotal() {
    return (this.car?.price || 0) * this.duration;
  }

  get total() {
    return this.subtotal + this.serviceFee;
  }

  updateDuration(val: number) {
    this.duration = Math.max(1, this.duration + val);
  }

  openPicker(id: string) {
    // Standard Angular Ionic template handler
  }

  selectPaymentMethod(method: 'midtrans') {
    this.selectedPaymentMethod = method;
  }

  /**
   * Main confirmation button trigger
   */
  async confirmBooking() {
    this.isProcessing = true;
    this.saveBooking('Transfer Bank Manual');
  }

  /**
   * Helper to capitalize payment type strings
   */
  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
  }

  // --- SIMULATOR CONTROL FUNCTIONS ---

  selectChannel(channel: 'va' | 'qris' | 'card') {
    if (channel === 'va') {
      this.selectedSubMethod = 'Virtual Account (BCA)';
      this.midtransStep = 'va_details';
      this.generateVaNumber();
    } else if (channel === 'qris') {
      this.selectedSubMethod = 'GoPay / QRIS';
      this.midtransStep = 'qris_details';
    } else if (channel === 'card') {
      this.selectedSubMethod = 'Credit/Debit Card';
      this.midtransStep = 'card_details';
      this.cardNumber = '';
      this.cardExpiry = '';
      this.cardCvv = '';
    }
  }

  selectBank(bank: 'bca' | 'mandiri' | 'bni' | 'bri') {
    this.selectedBank = bank;
    this.selectedSubMethod = `Virtual Account (${bank.toUpperCase()})`;
    this.generateVaNumber();
  }

  private generateVaNumber() {
    let prefix = '89108'; // BCA
    if (this.selectedBank === 'mandiri') prefix = '89508';
    if (this.selectedBank === 'bni') prefix = '89208';
    if (this.selectedBank === 'bri') prefix = '89308';
    
    // Random remainder to look highly realistic
    const randomSuffix = Math.floor(Math.random() * 89999999 + 10000000).toString();
    this.vaNumber = prefix + randomSuffix;
  }

  async copyVa() {
    navigator.clipboard.writeText(this.vaNumber);
    const toast = await this.toastCtrl.create({
      message: 'Virtual Account Number Copied!',
      duration: 1500,
      color: 'light',
      position: 'top'
    });
    toast.present();
  }

  submitCardPayment() {
    if (!this.cardNumber || !this.cardExpiry || !this.cardCvv) {
      this.presentAlertToast('Please fill in all credit card details.', 'warning');
      return;
    }
    
    // Open 3D secure OTP modal
    this.showOtpModal = true;
    this.otpCode = '';
  }

  confirmOtp() {
    if (!this.otpCode || this.otpCode.length < 4) {
      this.presentAlertToast('Please enter a valid OTP code.', 'warning');
      return;
    }
    
    this.showOtpModal = false;
    this.simulatePaymentSuccess();
  }

  simulatePaymentSuccess() {
    this.midtransStep = 'success';
  }

  closeMidtransModal(complete: boolean = false) {
    this.showMidtransModal = false;
    
    if (complete) {
      this.saveBooking(`Midtrans - ${this.selectedSubMethod}`);
    }
  }

  private async presentAlertToast(msg: string, color: 'warning' | 'danger') {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: color,
      position: 'top'
    });
    toast.present();
  }

  // --- FINAL SAVING LOGIC ---

  private saveBooking(paymentMethodName: string) {
    if (this.car) {
      this.mockData.createRental({
        carId: this.car.id,
        carName: this.car.model,
        carImage: this.car.image,
        startDate: this.pickupDate.includes('T') ? this.pickupDate.split('T')[0] : this.pickupDate,
        startTime: this.pickupTime.includes('T') ? this.pickupTime.split('T')[1].substring(0, 5) : this.pickupTime.substring(0, 5),
        endDate: new Date(new Date(this.pickupDate).getTime() + this.duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalPrice: this.total,
        plateNumber: this.car.plateNumber || ('B ' + Math.floor(Math.random() * 8999 + 1000) + ' ROA'),
        duration: this.duration,
        paymentMethod: paymentMethodName,
        paymentStatus: 'Unpaid'
      }).subscribe({
        next: async (newRental) => {
          this.isProcessing = false;
          const toast = await this.toastCtrl.create({
            message: 'Pemesanan Berhasil! Silakan lakukan transfer pembayaran.',
            duration: 2000,
            color: 'success',
            position: 'bottom'
          });
          toast.present();
          
          const cleanId = newRental.id.startsWith('#') ? newRental.id.substring(1) : newRental.id;
          this.navCtrl.navigateRoot('/customer/payment/' + cleanId);
        },
        error: async (err) => {
          this.isProcessing = false;
          const toast = await this.toastCtrl.create({
            message: 'Booking Failed: ' + (err.message || 'Server error'),
            duration: 3000,
            color: 'danger',
            position: 'bottom'
          });
          toast.present();
        }
      });
    } else {
      this.isProcessing = false;
    }
  }
}
