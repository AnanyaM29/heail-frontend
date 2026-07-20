import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OrgOrderResponse, EmployeeRow } from '../models/org-order.models';
import { OrgMonitorResponse, OrgReportResponse } from '../models/org-report.models';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/org/orders`;

@Injectable({ providedIn: 'root' })
export class OrgOrderService {
  private http = inject(HttpClient);

  createOrGetOrder() {
    return this.http.post<OrgOrderResponse>(API, {});
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

  acceptAgreement(id: string, version: string) {
    return this.http.post<OrgOrderResponse>(`${API}/${id}/agreement`, { version });
  }

  pay(id: string) {
    return this.http.post<OrgOrderResponse>(`${API}/${id}/pay`, {});
  }
}
