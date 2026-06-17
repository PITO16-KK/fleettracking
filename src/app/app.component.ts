import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Platform, ToastController } from '@ionic/angular';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';

// Root routes where back button should trigger exit confirmation
const ROOT_ROUTES = [
  '/login',
  '/customer',
  '/customer/home',
  '/customer/rentals',
  '/customer/profile',
  '/admin',
];

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  private lastBackPress = 0;
  private exitToastVisible = false;

  constructor(
    private platform: Platform,
    private router: Router,
    private location: Location,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.platform.ready();
    this.initTheme();

    // Hide splash screen after Angular is fully loaded
    try {
      await SplashScreen.hide({ fadeOutDuration: 400 });
    } catch (e) {
      // SplashScreen not available in browser/dev mode — safe to ignore
    }

    // Register back button handler
    this.initBackButton();
  }

  private initTheme() {
    // Only activate light theme if the user has explicitly enabled it.
    // Default is always dark mode (no system preference detection).
    const isLight = localStorage.getItem('theme_light') === 'true';
    document.body.classList.toggle('light-theme', isLight);
  }

  private initBackButton() {
    this.platform.backButton.subscribeWithPriority(10, async () => {
      const currentUrl = this.router.url;

      // Check if we are at a root page
      const isRoot = ROOT_ROUTES.some(route =>
        currentUrl === route || currentUrl.startsWith(route + '?')
      );

      if (!isRoot) {
        this.location.back();
        return;
      }

      const now = Date.now();
      const timeSinceLastPress = now - this.lastBackPress;

      if (timeSinceLastPress < 2000 && this.exitToastVisible) {
        // Second press within 2 seconds — exit the app
        await App.exitApp();
      } else {
        // First press — show toast and start timer
        this.lastBackPress = now;
        await this.showExitToast();
      }
    });
  }

  private async showExitToast() {
    // Dismiss any existing toast first
    try {
      await this.toastController.dismiss();
    } catch (_) {}

    this.exitToastVisible = true;

    const toast = await this.toastController.create({
      message: '⬅️  Tekan sekali lagi untuk keluar',
      duration: 2000,
      position: 'bottom',
      color: 'dark',
      cssClass: 'exit-toast',
      buttons: [{ icon: 'close', role: 'cancel' }]
    });

    toast.onDidDismiss().then(() => {
      this.exitToastVisible = false;
    });

    await toast.present();
  }
}
