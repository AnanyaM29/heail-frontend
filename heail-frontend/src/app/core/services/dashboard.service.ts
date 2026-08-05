import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MyDashboard } from '../models/dashboard.models';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/me`;

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getDashboard() {
    return this.http.get<MyDashboard>(`${API}/dashboard`);
  }
}
