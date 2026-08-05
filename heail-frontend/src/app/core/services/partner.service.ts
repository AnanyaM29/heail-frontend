import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/partners`;

export interface PartnerApplicationData {
  name: string;
  country: string;
  city: string;
  mobile: string;
  email: string;
  otp: string;
  consentGiven: boolean;
  resume: File | null;
}

@Injectable({ providedIn: 'root' })
export class PartnerService {
  private http = inject(HttpClient);

  sendOtp(email: string) {
    return this.http.post<void>(`${API}/send-otp`, { email });
  }

  apply(data: PartnerApplicationData) {
    const form = new FormData();
    form.set('name', data.name);
    form.set('country', data.country);
    form.set('city', data.city);
    form.set('mobile', data.mobile);
    form.set('email', data.email);
    form.set('otp', data.otp);
    form.set('consentGiven', String(data.consentGiven));
    if (data.resume) form.set('resume', data.resume);
    return this.http.post<void>(`${API}/apply`, form);
  }
}
