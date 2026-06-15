import { Injectable, Optional } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private baseUrl = environment.apiUrl;

    constructor(@Optional() private http?: HttpClient) { }

    // Helper untuk penanganan error HTTP
    private handleError(error: HttpErrorResponse) {
        if (error.error instanceof ErrorEvent) {
            // Error sisi klien atau jaringan
            console.error('An error occurred:', error.error.message);
        } else {
            // Backend mengembalikan kode respons yang tidak berhasil
            console.error(`Backend returned code ${error.status}, body was: ${error.error}`);
        }
        // Mengembalikan observable dengan pesan error yang ramah pengguna
        return throwError(() => new Error('Terjadi kesalahan saat mengambil data. Silakan coba lagi nanti.'));
    }

    // Mengambil data statistik untuk Landing Page dari endpoint /dashboard/stats
    getLandingStats(): Observable<any> { // Pertimbangkan untuk mendefinisikan interface spesifik untuk tipe kembalian
        if (!this.http) {
            return throwError(() => new Error('HttpClient not available'));
        }
        return this.http.get(`${this.baseUrl}/dashboard/stats`).pipe(
            catchError(this.handleError)
        );
    }

    // Kamu bisa menambahkan method lain seperti login, post data, dll di sini
    postData(endpoint: string, data: any): Observable<any> {
        if (!this.http) {
            return throwError(() => new Error('HttpClient not available'));
        }
        return this.http.post(`${this.baseUrl}/${endpoint}`, data).pipe(
            catchError(this.handleError)
        );
    }
}