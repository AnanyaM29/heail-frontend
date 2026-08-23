import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthResponse } from '../models/auth.models';
import { HrCandidateTokenInfo } from '../models/hr-candidate.models';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/hr/candidate`;

/** Public — no login required, no bearer token sent (the access token in the
 *  URL is itself the credential). See HrCandidateAccessController. */
@Injectable({ providedIn: 'root' })
export class HrCandidateAccessService {
  private http = inject(HttpClient);

  tokenInfo(token: string) {
    return this.http.get<HrCandidateTokenInfo>(`${API}/${token}`);
  }

  acceptTerms(token: string) {
    return this.http.post<void>(`${API}/${token}/accept-terms`, {});
  }

  redeem(token: string) {
    return this.http.post<AuthResponse>(`${API}/${token}/redeem`, {});
  }
}
