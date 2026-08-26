import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Order } from '../models/order.models';
import { CandidateRow, HrCandidateDto, HrOrderResponse, ReallocationRequest } from '../models/hr-candidate.models';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/hr/orders`;

@Injectable({ providedIn: 'root' })
export class HrOrderService {
  private http = inject(HttpClient);

  selectAssessments(assessmentIds: number[]) {
    return this.http.post<Order>(API, { assessmentIds });
  }

  getOrder(id: string) {
    return this.http.get<Order>(`${API}/${id}`);
  }

  getOrderWithCandidates(id: string) {
    return this.http.get<HrOrderResponse>(`${API}/${id}/candidates`);
  }

  setCandidates(id: string, rows: CandidateRow[]) {
    return this.http.put<HrOrderResponse>(`${API}/${id}/candidates`, rows);
  }

  listMyCandidates() {
    return this.http.get<HrCandidateDto[]>(`${API}/candidates/mine`);
  }

  /** Both return a fresh DRAFT order with one candidate already on it — the
   *  caller routes straight to /pricing/buy-hr/{id} to pay. */
  createRetakeOrder(candidateId: string) {
    return this.http.post<Order>(`${API}/candidates/${candidateId}/retake`, {});
  }

  createReallocationOrder(candidateId: string, body: ReallocationRequest) {
    return this.http.post<Order>(`${API}/candidates/${candidateId}/reallocate`, body);
  }

  acceptAgreement(id: string, version: string) {
    return this.http.post<Order>(`${API}/${id}/agreement`, { version });
  }

  applyCoupon(id: string, code: string) {
    return this.http.post<Order>(`${API}/${id}/apply-coupon`, { code });
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
