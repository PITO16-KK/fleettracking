import { Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CustomerDetails {
  name: string;
  email: string;
  phone?: string;
}

export interface MidtransPaymentResult {
  transaction_status: 'settlement' | 'pending' | 'deny' | 'expire' | 'cancel';
  status_code: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  pdf_url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MidtransService {
  private apiUrl = environment.apiUrl;
  private readonly midtransConfig = environment.midtrans || {
    mode: 'simulator',
    clientKey: 'SB-Mid-client-MockKey12345',
    snapScriptUrl: 'https://app.sandbox.midtrans.com/snap/snap.js'
  };

  // Mode is driven by environment configuration:
  // - simulator: internal UI-only mock flow
  // - sandbox: real Midtrans Snap checkout using sandbox CDN and token service
  public isSimulatorMode = this.midtransConfig.mode === 'simulator';

  private readonly snapScriptUrl = this.midtransConfig.snapScriptUrl;
  private readonly clientKey = this.midtransConfig.clientKey;
  private scriptLoaded = false;

  constructor(@Optional() private http?: HttpClient) {}

  /**
   * Generates a Midtrans Snap Token for checkout
   * @param rentalId The unique ID of the booking / rental order
   * @param amount The total transaction amount in IDR
   * @param customer Customer basic contact information
   */
  getSnapToken(rentalId: string, amount: number, customer: CustomerDetails): Observable<string> {
    if (this.isSimulatorMode) {
      // Simulate API response time of 800ms
      return new Observable<string>(observer => {
        setTimeout(() => {
          // Generate a realistic looking mock snap token
          const mockToken = `snap-token-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
          observer.next(mockToken);
          observer.complete();
        }, 800);
      });
    }

    // Real Server API Integration call
    const payload = {
      rentalId,
      amount,
      customerDetails: customer
    };

    if (!this.http) {
      return throwError(() => new Error('HttpClient is not available.'));
    }

    return this.http.post<{ token: string }>(`${this.apiUrl}/payment/token`, payload).pipe(
      map(response => response.token),
      catchError(error => {
        console.error('Midtrans Token Generation Failed:', error);
        return throwError(() => new Error('Could not initialize payment. Please try again.'));
      })
    );
  }

  /**
   * Dynamically loads the official Midtrans Snap.js SDK CDN script
   */
  private loadSnapScript(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.scriptLoaded) {
        resolve(true);
        return;
      }

      // Check if already in window
      if ((window as any).snap) {
        this.scriptLoaded = true;
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = this.snapScriptUrl;
      script.setAttribute('data-client-key', this.clientKey);
      script.async = true;

      script.onload = () => {
        this.scriptLoaded = true;
        console.log('Midtrans Snap SDK loaded successfully.');
        resolve(true);
      };

      script.onerror = (err) => {
        console.error('Failed to load Midtrans Snap SDK:', err);
        reject(new Error('Midtrans Snap script failed to load.'));
      };

      document.body.appendChild(script);
    });
  }

  /**
   * Opens the official Midtrans Snap Checkout Popup (For Real Backend API Mode)
   * @param snapToken The token obtained from getSnapToken()
   * @param callbacks Event callbacks for success, pending, error, and close states
   */
  payWithSnap(
    snapToken: string,
    callbacks: {
      onSuccess: (result: MidtransPaymentResult) => void;
      onPending: (result: MidtransPaymentResult) => void;
      onError: (result: any) => void;
      onClose: () => void;
    }
  ): void {
    if (this.isSimulatorMode) {
      console.warn('payWithSnap() called, but service is in simulator mode.');
      return;
    }

    this.loadSnapScript()
      .then(() => {
        const snap = (window as any).snap;
        if (!snap) {
          callbacks.onError(new Error('Snap JS SDK is not available on window.'));
          return;
        }

        snap.pay(snapToken, {
          onSuccess: (result: any) => {
            console.log('Midtrans payment success:', result);
            callbacks.onSuccess(result);
          },
          onPending: (result: any) => {
            console.log('Midtrans payment pending:', result);
            callbacks.onPending(result);
          },
          onError: (result: any) => {
            console.error('Midtrans payment error:', result);
            callbacks.onError(result);
          },
          onClose: () => {
            console.log('Midtrans checkout popup closed by user.');
            callbacks.onClose();
          }
        });
      })
      .catch(error => {
        callbacks.onError(error);
      });
  }
}
