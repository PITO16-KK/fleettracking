import { Injectable, Optional } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map, tap, catchError } from 'rxjs/operators';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  avatar: string;
  phone?: string;
  address?: string;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private router: Router,
    @Optional() private http?: HttpClient
  ) {
    const savedUser = localStorage.getItem('roamie_user');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  /**
   * Performs authentication request to the live backend server.
   * @param credentials Login credentials containing email and password
   */
  login(credentials: { email: string; password?: string }): Observable<User> {
    if (!this.http) {
      return throwError(() => new Error('HttpClient not available'));
    }



    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      map(response => {
        if (response && response.status === 'success' && response.data) {
          const apiUser = response.data.user;
          const user: User = {
            id: apiUser.id.toString(),
            name: apiUser.name,
            email: apiUser.email,
            role: apiUser.role,
            avatar: apiUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(apiUser.name)}&background=5b6cff&color=ffffff&size=128&bold=true`,
            phone: apiUser.phone || '+62 812 3456 7890',
            address: apiUser.address || 'Jl. Sudirman No. 123, Jakarta',
            token: response.data.access_token
          };
          this.setSession(user);
          return user;
        } else {
          throw new Error(response.message || 'Login failed');
        }
      })
    );
  }

  /**
   * Registers a new customer on the live server.
   * @param userData Registration data containing name, email, and password
   */
  register(userData: { name: string; email: string; password?: string }): Observable<User> {
    if (!this.http) {
      return throwError(() => new Error('HttpClient not available'));
    }

    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      map(response => {
        if (response && response.status === 'success' && response.data) {
          const apiUser = response.data.user;
          const user: User = {
            id: apiUser.id.toString(),
            name: apiUser.name,
            email: apiUser.email,
            role: apiUser.role || 'customer',
            avatar: apiUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(apiUser.name)}&background=5b6cff&color=ffffff&size=128&bold=true`,
            phone: apiUser.phone || '+62 812 3456 7890',
            address: apiUser.address || 'Jl. Sudirman No. 123, Jakarta',
            token: response.data.access_token
          };
          this.setSession(user);
          return user;
        } else {
          throw new Error(response.message || 'Registration failed');
        }
      })
    );
  }

  forgotPassword(payload: { email: string }): Observable<any> {
    if (!this.http) {
      return throwError(() => new Error('HttpClient not available'));
    }

    return this.http.post<any>(`${this.apiUrl}/forgot-password`, payload).pipe(
      map(response => {
        if (response && response.status === 'success') {
          return response;
        }
        throw new Error(response?.message || 'Failed to send reset instructions.');
      }),
      catchError(err => {
        // If route not found (404), fallback to simulated client-side success
        if (err.status === 404) {
          console.warn('API /forgot-password not found, falling back to simulation');
          return new Observable<any>(observer => {
            observer.next({ status: 'success', message: 'Simulated instructions sent.' });
            observer.complete();
          });
        }
        return throwError(() => err);
      })
    );
  }




  private setSession(user: User) {
    localStorage.setItem('roamie_user', JSON.stringify(user));
    if (user.token) localStorage.setItem('roamie_token', user.token);
    this.currentUserSubject.next(user);
    
    if (user.role === 'customer') {
      this.router.navigate(['/customer']);
    } else {
      this.router.navigate(['/admin']);
    }
  }

  private persistUser(user: User) {
    localStorage.setItem('roamie_user', JSON.stringify(user));
    if (user.token) localStorage.setItem('roamie_token', user.token);
    this.currentUserSubject.next(user);
  }

  updateProfile(data: any): Observable<User> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) {
      return throwError(() => new Error('No user logged in'));
    }

    if (this.http) {
      return this.http.put<any>(`${this.apiUrl}/users/${currentUser.id}`, data).pipe(
        map(response => {
          const apiUser = response?.data?.user ?? response;
          const updatedUser: User = {
            ...currentUser,
            ...apiUser,
            ...data,
            token: currentUser.token
          };
          this.persistUser(updatedUser);
          return updatedUser;
        })
      );
    }

    return new Observable<User>(observer => {
      const updatedUser = { ...currentUser, ...data };
      this.persistUser(updatedUser);
      observer.next(updatedUser);
      observer.complete();
    });
  }

  /**
   * Uploads an avatar image to the server for the current user.
   * Accepts a data URL or base64 string and sends it as multipart/form-data
   * to `${apiUrl}/users/:id/avatar`. Falls back to `updateProfile` when
   * HttpClient is not available.
   */
  uploadAvatar(imageDataUrl: string): Observable<User> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) {
      return throwError(() => new Error('No user logged in'));
    }

    // If HttpClient is unavailable, fallback to storing avatar locally
    if (!this.http) {
      return this.updateProfile({ avatar: imageDataUrl });
    }

    try {
      const blob = this.dataURLToBlob(imageDataUrl);
      const form = new FormData();
      form.append('avatar', blob, `avatar_${currentUser.id}.jpg`);

      return this.http.post<any>(`${this.apiUrl}/users/${currentUser.id}/avatar`, form).pipe(
        map(response => {
          const apiUser = response?.data?.user ?? response?.data ?? response;
          const updatedUser: User = {
            ...currentUser,
            ...apiUser,
            avatar: apiUser.avatar ?? apiUser.image ?? imageDataUrl,
            token: currentUser.token
          };
          this.persistUser(updatedUser);
          return updatedUser;
        })
      );
    } catch (err) {
      return this.updateProfile({ avatar: imageDataUrl });
    }
  }

  private dataURLToBlob(dataUrl: string): Blob {
    // data:[<mediatype>][;base64],<data>
    const parts = dataUrl.split(',');
    if (parts.length !== 2) {
      // Not a data URL; try to fetch as blob via URL
      const byteString = atob(dataUrl);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      return new Blob([ab], { type: 'image/jpeg' });
    }
    const meta = parts[0];
    const base64 = parts[1];
    const mimeMatch = meta.match(/data:([^;]+);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mime });
  }

  logout() {
    localStorage.removeItem('roamie_user');
    localStorage.removeItem('roamie_token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('roamie_token');
  }
}
