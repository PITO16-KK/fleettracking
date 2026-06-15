import { Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  type: 'Sedan' | 'SUV' | 'MPV' | 'Luxury';
  transmission: 'Automatic' | 'Manual' | '-' | string;
  fuel: string;
  seats: number | '-';
  image: string;
  status: 'Available' | 'On-going' | 'Maintenance';
  latitude?: number;
  longitude?: number;
  description?: string;
  rating?: number | '-';
  plateNumber?: string;
}

export interface Rental {
  id: string;
  carId: string;
  carName: string;
  carImage: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  totalPrice: number;
  status: 'Active' | 'Completed' | 'Cancelled';
  plateNumber?: string;
  duration?: number;
  paymentMethod?: string;
  paymentStatus?: 'Paid' | 'Unpaid' | 'Pending' | 'Rejected';
  isRated?: boolean;
}

export interface NotificationItem {
  id: string;
  rentalId: string;
  carId: string;
  carName: string;
  carImage: string;
  title: string;
  description: string;
  date: string;
  badge: string;
  type: 'pickup' | 'return' | 'info';
  status: 'primary' | 'warning' | 'success';
}

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private apiUrl = environment.apiUrl;
  
  // Shared state for cars to handle availability
  private carsSubject = new BehaviorSubject<Car[]>([]);
  public cars$ = this.carsSubject.asObservable();

  // Shared state for rentals to handle real-time updates
  private rentalsSubject = new BehaviorSubject<Rental[]>([]);
  public rentals$ = this.rentalsSubject.asObservable();

  constructor(@Optional() private http?: HttpClient) {
    // Only attempt network loads when HttpClient is available (tests may omit it)
    if (this.http) {
      this.loadCars();
      this.loadRentals();
    }
  }

  loadRentals() {
    if (!this.http) return;
    this.http.get<any>(`${this.apiUrl}/my-rentals`).pipe(
      map(response => {
        if (response && response.status === 'success' && Array.isArray(response.data)) {
          return response.data.map((r: any) => {
            const startDate = new Date(r.start_date);
            const returnDate = this.parseReturnDate(r, startDate);

            const apiStatus = r.rental_status || r.status;
            const status: 'Active' | 'Completed' | 'Cancelled' = this.normalizeRentalStatus(apiStatus);

            const carName = r.car ? (typeof r.car === 'object' ? r.car.name : r.car) : 'Unknown Car';
            const pricePerDay = r.car ? (typeof r.car === 'object' ? (typeof r.car.rental_price === 'string' ? parseFloat(r.car.rental_price) : r.car.rental_price) : 500000) : 500000;
            const totalPrice = pricePerDay * (r.duration_days ?? 1);

            let carImage = 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&q=80&w=200';
            if (r.car && typeof r.car === 'object' && r.car.image) {
              carImage = r.car.image;
            } else if (carName.toLowerCase().includes('camry')) {
              carImage = 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&q=80&w=200';
            } else if (carName.toLowerCase().includes('cr-v')) {
              carImage = 'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&q=80&w=200';
            } else if (carName.toLowerCase().includes('alphard')) {
              carImage = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=200';
            }

            const paymentStatusMap: Record<string, 'Paid' | 'Unpaid' | 'Pending' | 'Rejected'> = {
              'paid': 'Paid',
              'unpaid': 'Unpaid',
              'pending': 'Pending',
              'rejected': 'Rejected'
            };
            const mappedPaymentStatus = paymentStatusMap[r.payment_status?.toLowerCase()] || 'Unpaid';
            const mappedPaymentMethod = r.payment_method === 'manual_bank_transfer' ? 'Transfer Bank Manual' : (r.payment_method || 'Transfer Bank Manual');

            const actualRentalId = r.rental_id || r.id;
            const actualCarId = r.car && typeof r.car === 'object' ? r.car.id : (r.car_id || 1);

            return {
              id: '#' + actualRentalId,
              carId: actualCarId.toString(),
              carName: carName,
              carImage: carImage,
              startDate: r.start_date,
              endDate: returnDate.toISOString().split('T')[0],
              totalPrice: totalPrice,
              status: status,
              duration: r.duration_days,
              paymentMethod: mappedPaymentMethod,
              paymentStatus: mappedPaymentStatus,
              plateNumber: 'B ' + (1000 + parseInt(actualCarId)) + ' ROA'
            } as Rental;
          });
        }
        return this.getFallbackRentals();
      }),
      catchError(err => {
        console.error('Failed to load rentals from backend:', err);
        return of(this.getFallbackRentals());
      })
    ).subscribe(rentals => {
      const finalRentals = rentals && rentals.length > 0 ? rentals : this.getFallbackRentals();
      this.rentalsSubject.next(this.syncExpiredRentals(finalRentals));
    });
  }

  loadCars() {
    if (!this.http) return;

    this.http.get<any>(`${this.apiUrl}/cars`).pipe(
      map(response => {
        if (response && response.status === 'success' && Array.isArray(response.data)) {
          return response.data.map((lc: any) => {
            const nameParts = lc.name.split(' ');
            const brand = nameParts[0] || 'Car';
            const model = nameParts.slice(1).join(' ') || lc.name;
            
            let image = lc.image || 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&q=80&w=600';
            if (!lc.image) {
              if (lc.name.toLowerCase().includes('camry')) {
                image = 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&q=80&w=600';
              } else if (lc.name.toLowerCase().includes('cr-v')) {
                image = 'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&q=80&w=600';
              } else if (lc.name.toLowerCase().includes('alphard')) {
                image = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=600';
              } else if (lc.type.toLowerCase() === 'suv') {
                image = 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600';
              } else if (lc.type.toLowerCase() === 'mpv') {
                image = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600';
              }
            }

            let status: 'Available' | 'On-going' | 'Maintenance' = 'Available';
            if (lc.status === 'booked' || lc.status === 'on-going') {
              status = 'On-going';
            } else if (lc.status === 'maintenance') {
              status = 'Maintenance';
            }

            return {
              id: lc.id.toString(),
              brand: brand.toUpperCase(),
              model: model,
              year: lc.year || 2023,
              price: typeof lc.rental_price === 'string' ? parseFloat(lc.rental_price) : lc.rental_price,
              type: lc.type as any,
              transmission: lc.gearbox || lc.transmission || '-',
              fuel: lc.engine || lc.fuel || '-',
              seats: lc.seats || '-',
              image: image,
              status: status,
              latitude: lc.latitude != null ? Number(lc.latitude) : undefined,
              longitude: lc.longitude != null ? Number(lc.longitude) : undefined,
              description: lc.description || '-',
              rating: lc.rating != null ? Number(lc.rating) : '-',
              plateNumber: lc.plate_number || lc.plateNumber || '-'
            } as Car;
          });
        }
        return this.getFallbackCars();
      }),
      catchError(err => {
        console.error('Failed to load cars from backend:', err);
        return of(this.getFallbackCars());
      })
    ).subscribe(cars => {
      this.carsSubject.next(cars);
    });
  }

  private parseReturnDate(raw: any, startDate: Date): Date {
    if (raw.return_date) {
      return new Date(raw.return_date);
    }
    if (raw.end_date) {
      return new Date(raw.end_date);
    }
    const fallback = new Date(startDate);
    if (raw.duration_days != null) {
      fallback.setDate(fallback.getDate() + Number(raw.duration_days));
    }
    return fallback;
  }

  private getFallbackCars(): Car[] {
    return [
      {
        id: '1',
        brand: 'TOYOTA',
        model: 'Camry',
        year: 2024,
        price: 650000,
        type: 'Sedan',
        transmission: 'Automatic',
        fuel: 'Petrol',
        seats: 5,
        image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&q=80&w=600',
        status: 'Available',
        description: 'Smooth premium sedan with advanced comfort features.',
        rating: 4.8,
        plateNumber: 'B 1234 ROA'
      },
      {
        id: '2',
        brand: 'HONDA',
        model: 'CR-V',
        year: 2024,
        price: 750000,
        type: 'SUV',
        transmission: 'Automatic',
        fuel: 'Petrol',
        seats: 7,
        image: 'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&q=80&w=600',
        status: 'Available',
        description: 'Spacious family SUV with modern safety and luxury.',
        rating: 4.7,
        plateNumber: 'B 2345 ROA'
      },
      {
        id: '3',
        brand: 'TOYOTA',
        model: 'Alphard',
        year: 2023,
        price: 1100000,
        type: 'Luxury',
        transmission: 'Automatic',
        fuel: 'Petrol',
        seats: 7,
        image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=600',
        status: 'Available',
        description: 'Executive luxury MPV ideal for premium business travel.',
        rating: 4.9,
        plateNumber: 'B 3456 ROA'
      }
    ];
  }

  private getFallbackRentals(): Rental[] {
    return [];
  }

  private normalizeRentalStatus(raw: any): 'Active' | 'Completed' | 'Cancelled' {
    if (!raw) {
      return 'Active';
    }
    const status = raw.toString().toLowerCase();
    if (status === 'completed' || status === 'done' || status === 'finished') {
      return 'Completed';
    }
    if (status === 'cancelled' || status === 'canceled' || status === 'rejected') {
      return 'Cancelled';
    }
    return 'Active';
  }

  private syncExpiredRentals(rentals: Rental[]): Rental[] {
    const now = new Date();
    // Ensure rental items are strongly-typed and normalize any loose status strings
    const normalized: Rental[] = rentals.map(r => ({ ...r, status: r.status as 'Active' | 'Completed' | 'Cancelled' }));
    let updatedRentals: Rental[] = normalized.map(rental => {
      const rentalEnd = new Date(rental.endDate);
      if (rental.status === 'Active' && !isNaN(rentalEnd.getTime()) && now > rentalEnd) {
        return { ...rental, status: 'Completed' } as Rental;
      }
      return rental;
    });

    const cars = this.carsSubject.value.map(car => ({ ...car }));
    updatedRentals.forEach(rental => {
      if (rental.status === 'Completed') {
        const hasOtherActiveRental = updatedRentals.some(other => other.carId === rental.carId && other.id !== rental.id && other.status === 'Active');
        const carIndex = cars.findIndex(c => c.id === rental.carId);
        if (carIndex >= 0 && !hasOtherActiveRental && cars[carIndex].status !== 'Maintenance') {
          cars[carIndex].status = 'Available';
        }
      }
    });

    this.carsSubject.next(cars);
    return updatedRentals;
  }

  // --- CARS API ---
  getCars(): Observable<Car[]> {
    this.loadCars();
    return this.cars$;
  }


  getCarById(id: string): Observable<Car | undefined> {
    if (!this.http) {
      return this.cars$.pipe(
        map(cars => cars.find(c => c.id === id))
      );
    }

    return this.http.get<any>(`${this.apiUrl}/cars/${id}`).pipe(
      map(response => {
        if (response && response.status === 'success' && response.data) {
          const lc = response.data;
          const nameParts = lc.name.split(' ');
          const brand = nameParts[0] || 'Car';
          const model = nameParts.slice(1).join(' ') || lc.name;
          
          let image = 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&q=80&w=600';
          if (lc.name.toLowerCase().includes('camry')) {
            image = 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&q=80&w=600';
          } else if (lc.name.toLowerCase().includes('cr-v')) {
            image = 'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&q=80&w=600';
          } else if (lc.name.toLowerCase().includes('alphard')) {
            image = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=600';
          } else if (lc.type.toLowerCase() === 'suv') {
            image = 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600';
          } else if (lc.type.toLowerCase() === 'mpv') {
            image = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600';
          }

          let status: 'Available' | 'On-going' | 'Maintenance' = 'Available';
          if (lc.status === 'booked' || lc.status === 'on-going') {
            status = 'On-going';
          } else if (lc.status === 'maintenance') {
            status = 'Maintenance';
          }

          return {
            id: lc.id.toString(),
            brand: brand.toUpperCase(),
            model: model,
            year: lc.year || 2023,
            price: typeof lc.rental_price === 'string' ? parseFloat(lc.rental_price) : lc.rental_price,
            type: lc.type as any,
            transmission: lc.transmission || '-',
            fuel: lc.fuel || '-',
            seats: lc.seats || '-',
            image: image,
            status: status,
            latitude: lc.latitude != null ? Number(lc.latitude) : undefined,
            longitude: lc.longitude != null ? Number(lc.longitude) : undefined,
            description: lc.description || '-',
            rating: lc.rating != null ? Number(lc.rating) : '-',
            plateNumber: lc.plate_number || lc.plateNumber || '-'
          } as Car;
        }
        return undefined;
      }),
      catchError(err => {
        console.error(`Failed to fetch car details for ID ${id} from API, looking in local state:`, err);
        return this.cars$.pipe(
          map(cars => cars.find(c => c.id === id))
        );
      })
    );
  }

  updateCarStatus(id: string, status: 'Available' | 'On-going' | 'Maintenance'): Observable<boolean> {
    const cars = this.carsSubject.value;
    const index = cars.findIndex(c => c.id === id);
    if (index !== -1) {
      cars[index].status = status;
      this.carsSubject.next([...cars]);
      return of(true);
    }
    return of(false);
  }

  // --- RENTALS API ---
  getRentals(): Observable<Rental[]> {
    // On each consumer request, attempt a lightweight sync to mark expired rentals
    const currentValue = this.rentalsSubject.value;
    if (currentValue.length > 0) {
      const synced = this.syncExpiredRentals(currentValue);
      this.rentalsSubject.next(synced);
    }
    return this.rentals$;
  }

  getRentalById(id: string): Observable<Rental | undefined> {
    return this.rentals$.pipe(
      map(rentals => rentals.find(r => r.id === id))
    );
  }

  getNotifications(): Observable<NotificationItem[]> {
    return this.getRentals().pipe(
      map(rentals => {
        const notifications = rentals
          .filter(r => r.status === 'Active')
          .map(r => this.createNotificationFromRental(r))
          .filter((item): item is NotificationItem => !!item);

        return notifications.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
      })
    );
  }

  private createNotificationFromRental(rental: Rental): NotificationItem | null {
    const now = new Date();
    const startDate = new Date(`${rental.startDate}T00:00:00`);
    const endDate = new Date(`${rental.endDate}T00:00:00`);
    const oneDayMs = 1000 * 60 * 60 * 24;
    const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / oneDayMs);
    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / oneDayMs);

    if (daysUntilStart <= 0 && daysUntilEnd >= 0) {
      return {
        id: `${rental.id}-pickup`,
        rentalId: rental.id,
        carId: rental.carId,
        carName: rental.carName,
        carImage: rental.carImage,
        title: `Mobil siap pickup sekarang`,
        description: `Silakan ambil ${rental.carName} Anda hari ini. Nomor polisi ${rental.plateNumber || 'N/A'}.`,
        date: this.formatNotificationDate(now),
        badge: 'Pickup',
        type: 'pickup',
        status: 'success'
      };
    }

    if (daysUntilStart === 1) {
      return {
        id: `${rental.id}-pickup-soon`,
        rentalId: rental.id,
        carId: rental.carId,
        carName: rental.carName,
        carImage: rental.carImage,
        title: `Mobil siap pickup besok`,
        description: `${rental.carName} akan siap diambil besok. Persiapkan dokumen dan pembayaran jika belum selesai.`,
        date: this.formatNotificationDate(startDate),
        badge: 'Pickup Soon',
        type: 'pickup',
        status: 'primary'
      };
    }

    if (daysUntilEnd >= 0 && daysUntilEnd <= 2) {
      const suffix = daysUntilEnd === 0 ? 'hari ini' : `dalam ${daysUntilEnd} hari`;
      return {
        id: `${rental.id}-return`,
        rentalId: rental.id,
        carId: rental.carId,
        carName: rental.carName,
        carImage: rental.carImage,
        title: `Sewa akan berakhir ${suffix}`,
        description: `Harap kembalikan ${rental.carName} ${suffix}. Periksa kembali detail sewa dan jadwal pengembalian.`,
        date: this.formatNotificationDate(endDate),
        badge: 'Return',
        type: 'return',
        status: 'warning'
      };
    }

    if (daysUntilStart < 0 && daysUntilEnd > 2) {
      return {
        id: `${rental.id}-ongoing`,
        rentalId: rental.id,
        carId: rental.carId,
        carName: rental.carName,
        carImage: rental.carImage,
        title: `Rental aktif untuk ${rental.carName}`,
        description: `Sewa ${rental.carName} sedang berjalan sampai ${rental.endDate}. Lihat status pickup dan jadwal pengembalian.`,
        date: this.formatNotificationDate(now),
        badge: 'Ongoing',
        type: 'info',
        status: 'primary'
      };
    }

    return null;
  }

  private formatNotificationDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(date).toLocaleDateString('id-ID', options);
  }

  createRental(rentalData: any): Observable<Rental> {
    const payload = {
      car_id: parseInt(rentalData.carId),
      start_date: rentalData.startDate,
      duration_days: rentalData.duration
    };

    if (!this.http) {
      // Fallback offline behaviour for tests or missing HttpClient
      const fallbackRental: Rental = {
        id: '#' + Math.floor(Math.random() * 8999 + 1000),
        carId: rentalData.carId,
        carName: rentalData.carName,
        carImage: rentalData.carImage,
        startDate: rentalData.startDate,
        endDate: rentalData.endDate,
        startTime: rentalData.startTime,
        totalPrice: rentalData.totalPrice,
        status: 'Active',
        plateNumber: rentalData.plateNumber,
        duration: rentalData.duration,
        paymentMethod: rentalData.paymentMethod || 'Midtrans Secure Payment',
        paymentStatus: 'Paid'
      };
      const currentRentals = this.rentalsSubject.value;
      this.rentalsSubject.next([fallbackRental, ...currentRentals]);
      this.updateCarStatus(rentalData.carId, 'On-going');
      return of(fallbackRental);
    }

    return this.http.post<any>(`${this.apiUrl}/rentals`, payload).pipe(
      map(response => {
        if (response && response.status === 'success') {
          const newRental: Rental = {
            id: '#' + response.data.id,
            carId: rentalData.carId,
            carName: rentalData.carName,
            carImage: rentalData.carImage,
            startDate: rentalData.startDate,
            endDate: rentalData.endDate,
            startTime: rentalData.startTime,
            totalPrice: rentalData.totalPrice,
            status: 'Active',
            plateNumber: rentalData.plateNumber,
            duration: rentalData.duration,
            paymentMethod: 'Transfer Bank Manual',
            paymentStatus: 'Unpaid'
          };
          
          const currentRentals = this.rentalsSubject.value;
          this.rentalsSubject.next([newRental, ...currentRentals]);
          // Refresh car availability only — do NOT call loadRentals()
          // to avoid overwriting the just-added rental before backend commits.
          this.loadCars();
          return newRental;
        } else {
          throw new Error(response.message || 'Failed to create rental');
        }
      }),
      catchError(err => {
        console.error('Failed to create rental on backend, using fallback:', err);
        const fallbackRental: Rental = {
          id: '#' + Math.floor(Math.random() * 8999 + 1000),
          ...rentalData,
          status: 'Active',
          paymentMethod: 'Transfer Bank Manual',
          paymentStatus: 'Unpaid'
        };
        const currentRentals = this.rentalsSubject.value;
        this.rentalsSubject.next([fallbackRental, ...currentRentals]);
        this.updateCarStatus(rentalData.carId, 'On-going');
        return of(fallbackRental);
      })
    );
  }

  /**
   * Upload Bukti Transfer ke backend
   */
  uploadPaymentProof(rentalId: string, bankName: string, accountNumber: string, accountName: string, file: File): Observable<any> {
    if (!this.http) {
      return of({ status: 'success', message: 'Simulated proof upload success (offline)' });
    }
    
    // Clean up rental ID (remove leading '#' if present)
    const cleanedRentalId = rentalId.startsWith('#') ? rentalId.substring(1) : rentalId;

    const formData = new FormData();
    formData.append('rental_id', cleanedRentalId);
    formData.append('bank_name', bankName);
    formData.append('account_number', accountNumber);
    formData.append('account_name', accountName);
    formData.append('proof_of_payment', file);

    return this.http.post<any>(`${this.apiUrl}/payment/upload-proof`, formData).pipe(
      tap(() => {
        // Refresh rentals list to update status in client app state
        this.loadRentals();
      })
    );
  }

  /**
   * Ambil status pembayaran rental beserta rekening tujuan transfer
   */
  getPaymentStatus(rentalId: string): Observable<any> {
    const cleanedRentalId = rentalId.startsWith('#') ? rentalId.substring(1) : rentalId;
    
    if (!this.http) {
      return of({
        status: 'success',
        data: {
          rental_id: cleanedRentalId,
          total_price: 350000,
          payment_status: 'unpaid',
          bank_details: {
            bank_name: 'Bank Mandiri',
            account_number: '123-456-789-0',
            account_name: 'PT Roamie Rent Car'
          }
        }
      });
    }

    return this.http.get<any>(`${this.apiUrl}/payment/status/${cleanedRentalId}`);
  }

  /**
   * Update real-time GPS location of vehicle
   */
  updateGpsLocation(carId: string, latitude: number, longitude: number): Observable<any> {
    if (!this.http) return of(null);
    return this.http.post<any>(`${this.apiUrl}/gps/update`, {
      car_id: parseInt(carId),
      latitude,
      longitude
    });
  }

  /**
   * Send messages to AI Chatbot
   */
  sendChatbotMessage(messages: any[]): Observable<any> {
    if (!this.http) {
      return of({
        success: true,
        reply: 'Halo! Saya asisten offline Roamie. Ada yang bisa saya bantu?'
      });
    }
    return this.http.post<any>(`${this.apiUrl}/chatbot`, { messages });
  }
}
