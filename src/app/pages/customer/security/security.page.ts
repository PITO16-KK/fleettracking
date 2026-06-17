import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService, User } from '../../../services/auth.service';
import { ToastController, LoadingController, AlertController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-security',
  templateUrl: './security.page.html',
  styleUrls: ['./security.page.scss'],
  standalone: false
})
export class SecurityPage implements OnInit {
  passwordForm: FormGroup;
  currentUser: User | null = null;
  
  // Toggles state
  biometricEnabled = false;
  rememberMeEnabled = true;
  twoFactorEnabled = false;
  lightModeEnabled = false;
  
  // Password visibility triggers
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  
  isLoading = false;

  // Mock sessions
  sessions = [
    { id: 1, device: 'Google Pixel 8 (This Device)', location: 'Jakarta, Indonesia', active: true, icon: 'phone-portrait-outline' },
    { id: 2, device: 'Chrome Browser on Windows', location: 'Bandung, Indonesia', active: false, icon: 'desktop-outline' },
    { id: 3, device: 'iPhone 15 Pro Max', location: 'Surabaya, Indonesia', active: false, icon: 'phone-portrait-outline' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private navCtrl: NavController
  ) {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Get current user
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    // Load preferences
    this.biometricEnabled = localStorage.getItem('roamie_biometric') === 'true';
    this.rememberMeEnabled = localStorage.getItem('roamie_remember_me') !== 'false';
    this.twoFactorEnabled = localStorage.getItem('roamie_2fa') === 'true';
    this.lightModeEnabled = localStorage.getItem('theme_light') === 'true';
  }

  passwordMatchValidator(g: FormGroup) {
    const newPass = g.get('newPassword')?.value;
    const confirmPass = g.get('confirmPassword')?.value;
    return newPass === confirmPass ? null : { mismatch: true };
  }

  async handleSavePassword() {
    if (this.passwordForm.invalid) {
      if (this.passwordForm.hasError('mismatch')) {
        this.presentToast('Password baru dan konfirmasi tidak cocok.', 'danger');
      } else {
        this.presentToast('Harap isi password minimal 6 karakter.', 'danger');
      }
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.value;

    const loader = await this.loadingCtrl.create({
      message: 'Memperbarui password...',
      spinner: 'crescent'
    });
    await loader.present();
    this.isLoading = true;

    // Simulate saving the new password
    setTimeout(async () => {
      await loader.dismiss();
      this.isLoading = false;

      if (this.currentUser) {
        // In a real application, this would call a backend API.
        // For simulation purposes, we display a success message.
        this.presentToast('✓ Password berhasil diperbarui (Simulasi)!', 'success');
        this.passwordForm.reset();
      } else {
        this.presentToast('Gagal memperbarui password. Sesi telah berakhir.', 'danger');
      }
    }, 1500);
  }

  togglePreference(key: string, event: any) {
    const value = event.detail.checked;
    localStorage.setItem(`roamie_${key}`, value.toString());
    
    if (key === '2fa' && value) {
      this.presentToast('Dua faktor otentikasi (2FA) diaktifkan.', 'success');
    } else if (key === 'biometric' && value) {
      this.presentToast('Sidik Jari / Face ID diaktifkan.', 'success');
    }
  }

  setTheme(isLight: boolean) {
    this.lightModeEnabled = isLight;
    localStorage.setItem('theme_light', isLight ? 'true' : 'false');
    document.body.classList.toggle('light-theme', isLight);
    this.presentToast(
      isLight ? '☀️ Mode Terang diaktifkan.' : '🌙 Mode Gelap diaktifkan.',
      'success'
    );
  }

  /** @deprecated kept for back-compat if needed */
  toggleTheme(event: any) {
    this.setTheme(event.detail.checked);
  }

  async revokeSession(sessionId: number, deviceName: string) {
    const alert = await this.alertCtrl.create({
      header: 'Hapus Sesi',
      message: `Apakah Anda yakin ingin mengeluarkan akun dari ${deviceName}?`,
      buttons: [
        { text: 'Batal', role: 'cancel' },
        {
          text: 'Keluarkan',
          role: 'destructive',
          handler: () => {
            this.sessions = this.sessions.filter(s => s.id !== sessionId);
            this.presentToast(`Sesi pada ${deviceName} telah dikeluarkan.`, 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
      icon: color === 'success' ? 'checkmark-circle' : 'alert-circle'
    });
    await toast.present();
  }

  goBack() {
    this.navCtrl.back();
  }
}
