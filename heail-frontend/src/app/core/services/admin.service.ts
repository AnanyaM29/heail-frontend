import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AdminPartner, AdminPayment, AdminTestSession, AdminUser } from '../models/admin.models';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/admin/dashboard`;

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  tests(months = 3) {
    return this.http.get<AdminTestSession[]>(`${API}/tests`, { params: { months } });
  }

  payments(months = 12) {
    return this.http.get<AdminPayment[]>(`${API}/payments`, { params: { months } });
  }

  users() {
    return this.http.get<AdminUser[]>(`${API}/users`);
  }

  logins(months = 12) {
    return this.http.get<AdminUser[]>(`${API}/logins`, { params: { months } });
  }

  blacklistUser(id: string) {
    return this.http.patch(`${API}/users/${id}/blacklist`, {});
  }

  unblacklistUser(id: string) {
    return this.http.patch(`${API}/users/${id}/unblacklist`, {});
  }

  sendPaymentReminder(orderId: string) {
    return this.http.post(`${API}/orders/${orderId}/send-payment-reminder`, {});
  }

  sendPaymentReminders(orderIds: string[]) {
    return this.http.post(`${API}/orders/send-payment-reminders`, orderIds);
  }

  partners() {
    return this.http.get<AdminPartner[]>(`${API}/partners`);
  }

  partnerResume(id: string) {
    return this.http.get(`${API}/partners/${id}/resume`, { responseType: 'blob' });
  }
}
