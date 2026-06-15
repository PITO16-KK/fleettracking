import { Component, OnInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { MockDataService } from '../../../services/mock-data.service';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
  standalone: false
})
export class PaymentPage implements OnInit {
  rentalId!: string;
  rental: any = null;
  bankDetails: any = null;
  paymentDetails: any = null;
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'rejected' = 'unpaid';
  totalPrice: number = 0;

  // Selected payment method
  selectedMethod: 'dana' | 'bca' | 'mandiri' | 'bni' | 'qris' | null = null;

  // Form Fields
  bankName: string = '';
  accountNumber: string = '';
  accountName: string = '';
  selectedFile: File | null = null;
  filePreview: string | null = null;

  isLoading: boolean = true;
  isUploading: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private mockData: MockDataService,
    private navCtrl: NavController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.rentalId = this.route.snapshot.paramMap.get('id') || '';
    if (this.rentalId) {
      this.loadPaymentStatus();
    } else {
      this.presentToast('ID Transaksi tidak ditemukan', 'danger');
      this.navCtrl.back();
    }
  }

  loadPaymentStatus() {
    this.isLoading = true;
    this.mockData.getPaymentStatus(this.rentalId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response && response.status === 'success') {
          const data = response.data;
          this.rental = {
            id: data.rental_id,
            car: data.car,
            carImage: data.car_image,
            duration: data.duration_days,
            totalPrice: data.total_price
          };
          this.totalPrice = data.total_price;
          this.bankDetails = data.bank_details;
          this.paymentDetails = data.payment_details;
          this.paymentStatus = (data.payment_status || 'unpaid').toLowerCase() as any;

          // If rejected, pre-fill from previous details if any
          if (this.paymentStatus === 'rejected' && this.paymentDetails) {
            this.bankName = this.paymentDetails.bank_name || '';
            this.accountNumber = this.paymentDetails.account_number || '';
            this.accountName = this.paymentDetails.account_name || '';
          }
        } else {
          this.presentToast('Gagal memuat status pembayaran.', 'danger');
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error loading payment status:', err);
        this.presentToast('Koneksi ke server gagal.', 'danger');
      }
    });
  }

  selectMethod(method: 'dana' | 'bca' | 'mandiri' | 'bni' | 'qris') {
    this.selectedMethod = method;
    this.bankName = method.toUpperCase();
  }

  async copyText(text: string) {
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        this.presentToast('Nomor rekening/HP berhasil disalin!', 'success');
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      this.presentToast('Nomor rekening/HP berhasil disalin!', 'success');
    }
  }

  async selectImage() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt
      });

      if (image && image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        
        // Validate size (max 2MB)
        if (blob.size > 2 * 1024 * 1024) {
          this.presentToast('Ukuran gambar maksimal 2MB', 'warning');
          return;
        }

        const filename = `proof_${Date.now()}.${image.format}`;
        this.selectedFile = new File([blob], filename, { type: blob.type });
        this.filePreview = image.webPath;
      }
    } catch (error: any) {
      console.error('Camera/Gallery selection cancelled or failed:', error);
      if (error && error.message !== 'User cancelled photos app') {
        this.presentToast('Gagal memilih gambar: ' + error.message, 'danger');
      }
    }
  }

  submitProof() {
    if (!this.bankName.trim()) {
      this.presentToast('Nama Bank pengirim wajib diisi', 'warning');
      return;
    }
    if (!this.accountNumber.trim()) {
      this.presentToast('Nomor Rekening pengirim wajib diisi', 'warning');
      return;
    }
    if (!this.accountName.trim()) {
      this.presentToast('Nama Pemilik Rekening pengirim wajib diisi', 'warning');
      return;
    }
    if (!this.selectedFile) {
      this.presentToast('Bukti transfer wajib diunggah', 'warning');
      return;
    }

    this.isUploading = true;
    this.mockData.uploadPaymentProof(
      this.rentalId,
      this.bankName,
      this.accountNumber,
      this.accountName,
      this.selectedFile
    ).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.presentToast('Bukti transfer berhasil dikirim. Menunggu verifikasi admin.', 'success');
        this.selectedFile = null;
        this.filePreview = null;
        this.loadPaymentStatus();
      },
      error: (err) => {
        this.isUploading = false;
        console.error('Upload proof error:', err);
        this.presentToast(err.error?.message || 'Gagal mengunggah bukti transfer.', 'danger');
      }
    });
  }

  refreshStatus() {
    this.loadPaymentStatus();
    this.presentToast('Status pembayaran diperbarui', 'secondary');
  }

  goToRentals() {
    this.navCtrl.navigateRoot('/customer/rentals');
  }

  goToChatbot() {
    this.navCtrl.navigateForward('/help-center', {
      queryParams: { chat: 'true' }
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    toast.present();
  }
}
