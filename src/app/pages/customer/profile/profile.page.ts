import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService, User } from '../../../services/auth.service';
import { MockDataService, Rental } from '../../../services/mock-data.service';
import { Subscription } from 'rxjs';
import { ActionSheetController, ToastController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit, OnDestroy {
  user: User | null = null;
  totalRentals: number = 0;
  activeRentals: number = 0;
  totalSpent: number = 0;
  notificationCount: number = 0;
  
  private userSub: Subscription | null = null;
  private rentalSub: Subscription | null = null;
  private notificationSub: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private mockData: MockDataService
    ,
    private actionSheetCtrl: ActionSheetController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.mockData.loadRentals();
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });

    this.rentalSub = this.mockData.rentals$.subscribe(rentals => {
      this.totalRentals = rentals.length;
      this.activeRentals = rentals.filter(r => r.status === 'Active').length;
      this.totalSpent = rentals
        .filter(r => r.status !== 'Cancelled')
        .reduce((sum, r) => sum + r.totalPrice, 0);
    });

    this.notificationSub = this.mockData.getNotifications().subscribe(items => {
      this.notificationCount = items.length;
    });
  }

  ngOnDestroy() {
    if (this.userSub) this.userSub.unsubscribe();
    if (this.rentalSub) this.rentalSub.unsubscribe();
    if (this.notificationSub) this.notificationSub.unsubscribe();
    if (this.userSub) this.userSub.unsubscribe();
    if (this.rentalSub) this.rentalSub.unsubscribe();
  }

  logout() {
    this.authService.logout();
  }

  async openChangePhoto() {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Change Profile Photo',
      cssClass: 'profile-action-sheet',
      buttons: [
        {
          text: 'Take Photo',
          icon: 'camera',
          handler: () => { this.takePhoto(); }
        },
        {
          text: 'Choose from Gallery',
          icon: 'images',
          handler: () => { this.chooseFromGallery(); }
        },
        {
          text: 'Cancel',
          role: 'cancel',
          icon: 'close'
        }
      ]
    });

    await sheet.present();
  }

  private async takePhoto() {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });

      if (photo && (photo.base64String || (photo as any).base64)) {
        const base64Data = photo.base64String ?? (photo as any).base64;
        const dataUrl = `data:image/${photo.format || 'jpeg'};base64,${base64Data}`;
        await this.applyAvatarUpdate(dataUrl);
      } else if (photo && photo.webPath) {
        await this.applyAvatarUpdate(photo.webPath);
      }
    } catch (err) {
      const toast = await this.toastCtrl.create({ message: 'Camera not available.', duration: 2000, position: 'bottom' });
      toast.present();
    }
  }

  private async chooseFromGallery() {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos
      });

      if (photo && (photo.base64String || (photo as any).base64)) {
        const base64Data = photo.base64String ?? (photo as any).base64;
        const dataUrl = `data:image/${photo.format || 'jpeg'};base64,${base64Data}`;
        await this.applyAvatarUpdate(dataUrl);
      } else if (photo && photo.webPath) {
        await this.applyAvatarUpdate(photo.webPath);
      }
    } catch (err) {
      const toast = await this.toastCtrl.create({ message: 'Gallery not available.', duration: 2000, position: 'bottom' });
      toast.present();
    }
  }

  private async applyAvatarUpdate(dataUrl: string) {
    // Update local state first for instant feedback
    if (!this.user) return;
    this.user = { ...this.user, avatar: dataUrl } as User;

    // Prefer upload endpoint if available; fallback to updateProfile
    this.authService.uploadAvatar(dataUrl).subscribe({
      next: async updated => {
        // update local copy from server response
        this.user = updated;
        const toast = await this.toastCtrl.create({ message: 'Profile photo updated.', duration: 1500, position: 'bottom' });
        toast.present();
      },
      error: async () => {
        // Fallback: try simple profile update
        this.authService.updateProfile({ avatar: dataUrl }).subscribe({
          next: async () => {
            const toast = await this.toastCtrl.create({ message: 'Profile photo updated locally.', duration: 1500, position: 'bottom' });
            toast.present();
          },
          error: async () => {
            const toast = await this.toastCtrl.create({ message: 'Failed to save profile photo.', duration: 2000, position: 'bottom' });
            toast.present();
          }
        });
      }
    });
  }
}
