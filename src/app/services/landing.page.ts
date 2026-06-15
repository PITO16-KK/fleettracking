import { Component, OnInit } from '@angular/core';
import { ApiService } from './api.service';

@Component({
    selector: 'app-landing',
    templateUrl: './landing.page.html',
    styleUrls: ['./landing.page.scss'],
    standalone: false,
})
export class LandingPage implements OnInit {
    stats: any = { // Pertimbangkan untuk mendefinisikan interface untuk stats
        activeCars: '0',
        happyCustomers: '0',
        gpsAccuracy: '0%'
    };
    isLoading: boolean = true;
    errorMessage: string | null = null;

    constructor(private apiService: ApiService) { }

    ngOnInit() {
        this.apiService.getLandingStats().subscribe({
            next: (data: any) => {
                this.stats = data;
                this.isLoading = false;
            },
            error: (err: any) => {
                console.error('Gagal mengambil statistik landing:', err);
                this.errorMessage = 'Gagal memuat data statistik. Silakan coba lagi.';
                this.isLoading = false;
            }
        });
    }
}