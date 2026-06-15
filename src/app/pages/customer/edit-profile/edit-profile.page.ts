import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService, User } from '../../../services/auth.service';
import { ToastController, NavController, AlertController, LoadingController, ActionSheetController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
  standalone: false
})
export class EditProfilePage implements OnInit, OnDestroy {
  profileForm: FormGroup;
  user: User | null = null;
  isLoading = false;
  tempAvatar: string | undefined;
  private userSub: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private actionSheetCtrl: ActionSheetController
  ) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern('^[+0-9\\s\\-]+$')]],
      address: ['']
    });
  }

  ngOnInit() {
    this.userSub = this.authService.currentUser$.subscribe((u: any) => {
      this.user = u;
      if (u) {
        this.tempAvatar = u.avatar;
        this.profileForm.patchValue({
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          address: u.address || ''
        });
      }
    });
  }

  ngOnDestroy() {
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
  }

  get isDirty(): boolean {
    return this.profileForm.dirty || this.tempAvatar !== this.user?.avatar;
  }

  async changeAvatar() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Change Profile Photo',
      buttons: [
        {
          text: 'Take Photo',
          icon: 'camera-outline',
          handler: () => { this.pickImage(CameraSource.Camera); }
        },
        {
          text: 'Choose from Gallery',
          icon: 'image-outline',
          handler: () => { this.pickImage(CameraSource.Photos); }
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  private async pickImage(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: source
      });

      if (image && image.dataUrl) {
        this.tempAvatar = image.dataUrl;
      }
    } catch (error) {
      console.error('Error picking image', error);
    }
  }

  async goBack() {
    if (this.isDirty) {
      const alert = await this.alertCtrl.create({
        header: 'Discard Changes?',
        message: 'You have unsaved changes. Are you sure you want to go back?',
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          { 
            text: 'Discard', 
            role: 'destructive',
            handler: () => { this.navCtrl.back(); }
          }
        ]
      });
      await alert.present();
    } else {
      this.navCtrl.back();
    }
  }

  async saveProfile() {
    if (this.profileForm.invalid || !this.isDirty) return;

    const loader = await this.loadingCtrl.create({
      message: 'Updating profile...',
      spinner: 'crescent',
      backdropDismiss: false
    });
    await loader.present();
    this.isLoading = true;

    this.authService.updateProfile({
      ...this.profileForm.value,
      avatar: this.tempAvatar
    }).subscribe({
      next: async () => {
        this.isLoading = false;
        await loader.dismiss();

        const toast = await this.toastCtrl.create({
          message: '✓ Profile updated successfully',
          duration: 2500,
          color: 'success',
          position: 'bottom',
          icon: 'checkmark-circle'
        });
        await toast.present();

        this.profileForm.markAsPristine();
        this.navCtrl.navigateBack('/customer/profile');
      },
      error: async (err) => {
        this.isLoading = false;
        await loader.dismiss();
        console.error('Update profile error:', err);

        const toast = await this.toastCtrl.create({
          message: 'Failed to update profile. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'bottom',
          icon: 'alert-circle'
        });
        await toast.present();
      }
    });
  }
}
