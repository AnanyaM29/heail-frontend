import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Order } from '../models/order.models';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/leader/orders`;

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);

  createOrGetOrder() {
    return this.http.post<Order>(API, {});
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

  pay(id: string) {
    return this.http.post<Order>(`${API}/${id}/pay`, {});
  }
}
