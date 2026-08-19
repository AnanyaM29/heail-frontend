import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Order } from '../models/order.models';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/leader/orders`;

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);

  createOrGetOrder(currency?: string) {
    return this.http.post<Order>(API, currency ? { currency } : {});
  }

  getOrder(id: string) {
    return this.http.get<Order>(`${API}/${id}`);
  }

  updateDetails(id: string, designation: string, organisationName: string) {
    return this.http.post<Order>(`${API}/${id}/details`, { designation, organisationName });
  }

  acceptAgreement(id: string, version: string) {
    return this.http.post<Order>(`${API}/${id}/agreement`, { version });
  }

  createRazorpayOrder(id: string) {
    return this.http.post<Order>(`${API}/${id}/create-razorpay-order`, {});
  }

  verifyRazorpayPayment(id: string, payload: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
    return this.http.post<Order>(`${API}/${id}/verify-razorpay-payment`, payload);
  }

  forceCompleteTestPayment(id: string) {
    return this.http.post<Order>(`${API}/${id}/force-complete-test-payment`, {});
  }
}
