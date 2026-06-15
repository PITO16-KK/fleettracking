import { Component, OnInit } from '@angular/core';
import { MockDataService, NotificationItem } from '../../../services/mock-data.service';
import { ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false
})
export class NotificationsPage implements OnInit {
  notifications: NotificationItem[] = [];
  filteredNotifications: NotificationItem[] = [];
  loading = true;
  activeFilter = 'all';
  readNotificationIds: string[] = [];

  constructor(
    private mockData: MockDataService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    // Load read notifications IDs from localStorage
    const savedReadIds = localStorage.getItem('roamie_read_notifications');
    if (savedReadIds) {
      this.readNotificationIds = JSON.parse(savedReadIds);
    }

    this.loadNotifications();
  }

  loadNotifications() {
    this.loading = true;
    this.mockData.getNotifications().subscribe({
      next: (items) => {
        this.notifications = items;
        
        // Auto mark all notifications as read when the user views the screen
        this.notifications.forEach(n => {
          if (!this.readNotificationIds.includes(n.id)) {
            this.readNotificationIds.push(n.id);
          }
        });
        localStorage.setItem('roamie_read_notifications', JSON.stringify(this.readNotificationIds));

        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilter() {
    if (this.activeFilter === 'all') {
      this.filteredNotifications = [...this.notifications];
    } else {
      this.filteredNotifications = this.notifications.filter(
        item => item.type === this.activeFilter
      );
    }
  }

  selectFilter(filter: string) {
    this.activeFilter = filter;
    this.applyFilter();
  }

  isRead(id: string): boolean {
    return this.readNotificationIds.includes(id);
  }

  markAsRead(id: string) {
    if (!this.readNotificationIds.includes(id)) {
      this.readNotificationIds.push(id);
      localStorage.setItem('roamie_read_notifications', JSON.stringify(this.readNotificationIds));
    }
  }

  async markAllAsRead() {
    if (this.notifications.length === 0) return;

    this.notifications.forEach(n => {
      if (!this.readNotificationIds.includes(n.id)) {
        this.readNotificationIds.push(n.id);
      }
    });
    localStorage.setItem('roamie_read_notifications', JSON.stringify(this.readNotificationIds));
    
    const toast = await this.toastCtrl.create({
      message: 'Semua notifikasi ditandai telah dibaca.',
      duration: 2000,
      color: 'success',
      icon: 'checkmark-done-circle'
    });
    await toast.present();
  }

  async clearNotifications() {
    if (this.notifications.length === 0) return;

    const alert = await this.alertCtrl.create({
      header: 'Hapus Semua',
      message: 'Apakah Anda yakin ingin menghapus semua riwayat notifikasi?',
      buttons: [
        { text: 'Batal', role: 'cancel' },
        {
          text: 'Hapus',
          role: 'destructive',
          handler: () => {
            // Since mock notifications are derived from active rentals, we can mock empty states
            this.notifications = [];
            this.filteredNotifications = [];
            this.presentToast('Semua notifikasi dihapus.');
          }
        }
      ]
    });
    await alert.present();
  }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color: 'dark'
    });
    await toast.present();
  }
}
