import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HrAssessment, HrStartAssessmentResponse, HrSessionResumeResponse, HrResult } from '../models/hr.models';
import { AnswerResponse } from '../models/assessment.models';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/hr`;

@Injectable({ providedIn: 'root' })
export class HrAssessmentService {
  private http = inject(HttpClient);

  assessments() {
    return this.http.get<HrAssessment[]>(`${API}/assessments`);
  }

  start(assessmentId: number) {
    return this.http.post<HrStartAssessmentResponse>(`${API}/assessments/${assessmentId}/start`, {});
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
