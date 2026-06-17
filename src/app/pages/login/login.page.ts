import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  name: string = '';
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;
  isRegisterMode: boolean = false;

  constructor(
    private authService: AuthService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() { }

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.email = '';
    this.password = '';
    this.name = '';
  }

  async handleRegister() {
    if (!this.name || !this.email || !this.password) {
      const toast = await this.toastCtrl.create({
        message: 'Please fill in all registration fields.',
        duration: 2000,
        color: 'danger',
        position: 'bottom'
      });
      toast.present();
      return;
    }

    this.isLoading = true;

    this.authService.register({
      name: this.name,
      email: this.email,
      password: this.password
    }).subscribe({
      next: async () => {
        this.isLoading = false;
        const toast = await this.toastCtrl.create({
          message: 'Registration successful!',
          duration: 2000,
          color: 'success',
          position: 'bottom'
        });
        toast.present();
      },
      error: async (err) => {
        this.isLoading = false;
        let errMsg = 'Registration failed.';
        if (err && err.error) {
          if (err.error.errors) {
            const errorKeys = Object.keys(err.error.errors);
            const messages = errorKeys.map(key => err.error.errors[key].join(' '));
            errMsg = messages.join('\n');
          } else if (err.error.message) {
            errMsg = err.error.message;
          }
        } else if (err && err.message) {
          errMsg = err.message;
        }
        const toast = await this.toastCtrl.create({
          message: errMsg,
          duration: 3000,
          color: 'danger',
          position: 'bottom'
        });
        toast.present();
      }
    });
  }

  async handleLogin() {
    if (!this.email || !this.password) {
      const toast = await this.toastCtrl.create({
        message: 'Please enter both email and password.',
        duration: 2000,
        color: 'danger',
        position: 'bottom'
      });
      toast.present();
      return;
    }

    this.isLoading = true;

    // Authenticate with the live backend API
    this.authService.login({
      email: this.email,
      password: this.password
    }).subscribe({
      next: async () => {
        this.isLoading = false;
        const toast = await this.toastCtrl.create({
          message: 'Login Successful! Welcome to Roamie.',
          duration: 2000,
          color: 'success',
          position: 'bottom'
        });
        toast.present();
      },
      error: async (err) => {
        this.isLoading = false;
        let errMsg = 'Login failed. Please check your credentials.';
        if (err && err.error) {
          if (err.error.message) {
            errMsg = err.error.message;
          } else if (err.error.errors) {
            const errorKeys = Object.keys(err.error.errors);
            const messages = errorKeys.map(key => err.error.errors[key].join(' '));
            errMsg = messages.join('\n');
          }
        } else if (err && err.message) {
          errMsg = err.message;
        }
        const toast = await this.toastCtrl.create({
          message: errMsg,
          duration: 3000,
          color: 'danger',
          position: 'bottom'
        });
        toast.present();
      }
    });
  }

  async openForgotPassword() {
    const alert = await this.alertCtrl.create({
      header: 'Forgot Password',
      message: 'Enter the email address associated with your account.',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'Email Address'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Send',
          handler: (data) => {
            if (!data?.email || !this.isValidEmail(data.email)) {
              this.presentToast('Please enter a valid email address.', 'danger');
              return false;
            }
            this.sendResetPasswordRequest(data.email);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async sendResetPasswordRequest(email: string) {
    this.isLoading = true;
    this.authService.forgotPassword({ email }).subscribe({
      next: async () => {
        this.isLoading = false;
        await this.presentToast('✓ Verification instructions sent to your email!', 'success');
        setTimeout(() => {
          this.openOtpVerification(email);
        }, 1000);
      },
      error: async (err) => {
        this.isLoading = false;
        await this.presentToast(err.message || 'Unable to send reset instructions. Please try again later.', 'danger');
      }
    });
  }

  private async openOtpVerification(email: string) {
    const alert = await this.alertCtrl.create({
      header: 'Verify Code',
      message: `Enter the 4-digit verification code sent to ${email}. (Demo Code: 1234)`,
      inputs: [
        {
          name: 'otp',
          type: 'text',
          placeholder: 'Enter 4-digit OTP'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Verify',
          handler: (data) => {
            if (data?.otp === '1234') {
              this.presentToast('Code verified successfully!', 'success');
              setTimeout(() => {
                this.openNewPasswordInput(email);
              }, 1000);
              return true;
            } else {
              this.presentToast('Invalid verification code. Please enter 1234.', 'danger');
              return false;
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private async openNewPasswordInput(email: string) {
    const alert = await this.alertCtrl.create({
      header: 'Reset Password',
      message: 'Enter your new password below.',
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: 'New Password'
        },
        {
          name: 'confirmPassword',
          type: 'password',
          placeholder: 'Confirm Password'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save Password',
          handler: (data) => {
            if (!data?.password || data.password.length < 6) {
              this.presentToast('Password must be at least 6 characters long.', 'danger');
              return false;
            }
            if (data.password !== data.confirmPassword) {
              this.presentToast('Passwords do not match.', 'danger');
              return false;
            }
            
            this.presentToast('✓ Password reset simulated successfully (Local override disabled for security).', 'success');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
