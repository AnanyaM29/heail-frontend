import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/contact`;

export interface ContactSubmitData {
  name: string;
  mobile: string;
  email: string;
  city: string;
  country: string;
  message: string;
  otp: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private http = inject(HttpClient);

  sendOtp(email: string, mobile?: string) {
    return this.http.post<void>(`${API}/send-otp`, { email, mobile });
  }

  submit(data: ContactSubmitData) {
    return this.http.post<void>(`${API}/submit`, data);
  }
}
