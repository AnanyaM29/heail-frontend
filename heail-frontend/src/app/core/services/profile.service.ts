import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  ProfileResponse, ProfileOtpRequest, VerifyProfileOtpRequest,
  UpdateProfileRequest, UpdateProfileResponse
} from '../models/profile.models';

const API = `${environment.apiBaseUrl}/api/v1/me/profile`;

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);

  get() {
    return this.http.get<ProfileResponse>(API);
  }

  sendOtp(req: ProfileOtpRequest) {
    return this.http.post<{ message: string }>(`${API}/send-otp`, req);
  }

  verifyOtp(req: VerifyProfileOtpRequest) {
    return this.http.post<{ message: string }>(`${API}/verify-otp`, req);
  }

  update(req: UpdateProfileRequest) {
    return this.http.put<UpdateProfileResponse>(API, req);
  }
}
