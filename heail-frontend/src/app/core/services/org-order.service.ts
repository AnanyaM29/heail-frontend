import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OrgOrderResponse, EmployeeRow } from '../models/org-order.models';
import { OrgMonitorResponse, OrgReportResponse } from '../models/org-report.models';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/org/orders`;

@Injectable({ providedIn: 'root' })
export class OrgOrderService {
  private http = inject(HttpClient);

  createOrGetOrder(currency?: string) {
    return this.http.post<OrgOrderResponse>(API, currency ? { currency } : {});
  }

  getOrder(id: string) {
    return this.http.get<OrgOrderResponse>(`${API}/${id}`);
  }

  listMyOrders() {
    return this.http.get<OrgOrderResponse[]>(`${API}/mine`);
  }

  getMonitor(id: string) {
    return this.http.get<OrgMonitorResponse>(`${API}/${id}/monitor`);
  }

  getReport(id: string) {
    return this.http.get<OrgReportResponse>(`${API}/${id}/report`);
  }

  setEmployees(id: string, rows: EmployeeRow[]) {
    return this.http.put<OrgOrderResponse>(`${API}/${id}/employees`, rows);
  }

  setOrgDetails(id: string, organisationName: string, headcount: number, industry: string) {
    return this.http.put<OrgOrderResponse>(`${API}/${id}/organisation`, { organisationName, headcount, industry });
  }

  acceptAgreement(id: string, version: string) {
    return this.http.post<OrgOrderResponse>(`${API}/${id}/agreement`, { version });
  }

  createRazorpayOrder(id: string) {
    return this.http.post<OrgOrderResponse>(`${API}/${id}/create-razorpay-order`, {});
  }

  verifyRazorpayPayment(id: string, payload: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
    return this.http.post<OrgOrderResponse>(`${API}/${id}/verify-razorpay-payment`, payload);
  }

  forceCompleteTestPayment(id: string) {
    return this.http.post<OrgOrderResponse>(`${API}/${id}/force-complete-test-payment`, {});
  }

  cancel(id: string) {
    return this.http.post<OrgOrderResponse>(`${API}/${id}/cancel`, {});
  }
}
