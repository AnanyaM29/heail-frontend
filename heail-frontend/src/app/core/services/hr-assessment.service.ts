import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HrAssessment, HrAssignment, HrStartAssessmentResponse, HrSessionResumeResponse, HrResult } from '../models/hr.models';
import { AnswerResponse } from '../models/assessment.models';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/hr`;

@Injectable({ providedIn: 'root' })
export class HrAssessmentService {
  private http = inject(HttpClient);

  /** The 7-pillar catalogue — one row per pillar type, used for browsing/buying. */
  assessments() {
    return this.http.get<HrAssessment[]>(`${API}/assessments`);
  }

  /** Every individual assignment (entitlement) the caller holds — one card per
   *  assignment, even when the same pillar was assigned to them more than once. */
  assignments() {
    return this.http.get<HrAssignment[]>(`${API}/assessments/mine`);
  }

  /** Keyed by entitlementId — the specific assignment — not by pillar type, so
   *  starting always acts on exactly the assignment card that was clicked even
   *  when the same pillar was assigned more than once. */
  start(entitlementId: string) {
    return this.http.post<HrStartAssessmentResponse>(`${API}/assignments/${entitlementId}/start`, {});
  }

  current(assessmentId: number) {
    return this.http.get<HrSessionResumeResponse | null>(`${API}/assessments/${assessmentId}/current`);
  }

  resume(sessionId: string) {
    return this.http.get<HrSessionResumeResponse>(`${API}/sessions/${sessionId}`);
  }

  answer(sessionId: string, questionId: string, selectedOption: string) {
    return this.http.post<AnswerResponse>(`${API}/sessions/${sessionId}/answer`, { questionId, selectedOption });
  }

  submit(sessionId: string, forced = false) {
    return this.http.post<HrResult>(`${API}/sessions/${sessionId}/submit`, {}, { params: { forced } });
  }

  results() {
    return this.http.get<HrResult[]>(`${API}/results`);
  }
}
