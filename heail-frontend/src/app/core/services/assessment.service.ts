import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  StartAssessmentResponse, SessionResumeResponse, AnswerResponse, LeaderResult, EntitlementResponse
} from '../models/assessment.models';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/leader/assessment`;

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  private http = inject(HttpClient);

  start() {
    return this.http.post<StartAssessmentResponse>(`${API}/start`, {});
  }

  entitlement() {
    return this.http.get<EntitlementResponse>(`${API}/entitlement`);
  }

  current() {
    return this.http.get<SessionResumeResponse | null>(`${API}/current`);
  }

  resume(sessionId: string) {
    return this.http.get<SessionResumeResponse>(`${API}/${sessionId}`);
  }

  answer(sessionId: string, questionId: string, selectedOption: string) {
    return this.http.post<AnswerResponse>(`${API}/${sessionId}/answer`, { questionId, selectedOption });
  }

  submit(sessionId: string) {
    return this.http.post<LeaderResult>(`${API}/${sessionId}/submit`, {});
  }

  results() {
    return this.http.get<LeaderResult[]>(`${API}/results`);
  }
}
