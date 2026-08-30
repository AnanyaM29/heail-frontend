import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AdminPartner, AdminPayment, AdminTestSession, AdminUser, DiscountCoupon, InvoiceCounter, PagedResponse } from '../models/admin.models';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/admin/dashboard`;
const COUPONS_API = `${environment.apiBaseUrl}/api/v1/admin/coupons`;
const INVOICE_NUMBER_API = `${environment.apiBaseUrl}/api/v1/admin/invoice-number`;

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  // Pagination and search are handled server-side (LIMIT/OFFSET + a filtered
  // query in Postgres) rather than fetching the whole table and slicing it
  // client-side — see AdminDashboardService on the backend.
  tests(months = 3, page = 0, size = 25, q = '') {
    return this.http.get<PagedResponse<AdminTestSession>>(`${API}/tests`, { params: { months, page, size, q } });
  }

  payments(months = 12, page = 0, size = 25, q = '') {
    return this.http.get<PagedResponse<AdminPayment>>(`${API}/payments`, { params: { months, page, size, q } });
  }

  users(page = 0, size = 25, q = '') {
    return this.http.get<PagedResponse<AdminUser>>(`${API}/users`, { params: { page, size, q } });
  }

  logins(months = 12, page = 0, size = 25, q = '') {
    return this.http.get<PagedResponse<AdminUser>>(`${API}/logins`, { params: { months, page, size, q } });
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

  resendInvoice(orderId: string) {
    return this.http.post(`${API}/orders/${orderId}/resend-invoice`, {});
  }

  resendInvoiceForTest(sessionId: string) {
    return this.http.post(`${API}/tests/${sessionId}/resend-invoice`, {});
  }

  resendResults(userId: string) {
    return this.http.post(`${API}/users/${userId}/resend-results`, {});
  }

  setFeeDiscount(userId: string, percent: number) {
    return this.http.patch(`${API}/users/${userId}/fee-discount`, {}, { params: { percent } });
  }

  sendPaymentReminders(orderIds: string[]) {
    return this.http.post(`${API}/orders/send-payment-reminders`, orderIds);
  }

  partners(page = 0, size = 25, q = '') {
    return this.http.get<PagedResponse<AdminPartner>>(`${API}/partners`, { params: { page, size, q } });
  }

  partnerResume(id: string) {
    return this.http.get(`${API}/partners/${id}/resume`, { responseType: 'blob' });
  }

  generateCoupon(discountPercent: number, email?: string) {
    return this.http.post<DiscountCoupon>(COUPONS_API, { discountPercent, email: email || null });
  }

  listCoupons() {
    return this.http.get<DiscountCoupon[]>(COUPONS_API);
  }

  revokeCoupon(code: string) {
    return this.http.post(`${COUPONS_API}/${code}/revoke`, {});
  }

  // ── Shared invoice-number counter (Postgres sequence invoice_seq) ──
  // Website invoices and manual/offline invoices both draw from this, so
  // numbers stay in one sequence with no duplicates.
  invoiceCounter() {
    return this.http.get<InvoiceCounter>(INVOICE_NUMBER_API);
  }

  /** Advances the counter and returns the number to write on a manual invoice. */
  takeNextInvoiceNumber() {
    return this.http.post<{ invoiceNumber: string }>(`${INVOICE_NUMBER_API}/next`, {});
  }

  /** Sets the counter so the next invoice number is `nextValue`. */
  setInvoiceCounter(nextValue: number) {
    return this.http.put<InvoiceCounter>(INVOICE_NUMBER_API, {}, { params: { nextValue } });
  }
}
