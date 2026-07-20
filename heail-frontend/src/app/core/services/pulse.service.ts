import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StartAssessmentResponse, SessionResumeResponse, AnswerResponse } from '../models/assessment.models';
import { PulseStatusResponse, PulseSubmitResponse, PulseCode } from '../models/pulse.models';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/employee/pulse`;

@Injectable({ providedIn: 'root' })
export class PulseService {
  private http = inject(HttpClient);

  status() {
    return this.http.get<PulseStatusResponse>(`${API}/status`);
  }

  start(pulseCode: PulseCode) {
    return this.http.post<StartAssessmentResponse>(`${API}/${pulseCode}/start`, {});
  }

  resume(sessionId: string) {
    return this.http.get<SessionResumeResponse>(`${API}/${sessionId}`);
  }

  answer(sessionId: string, questionId: string, selectedOption: string) {
    return this.http.post<AnswerResponse>(`${API}/${sessionId}/answer`, { questionId, selectedOption });
  }

  submit(sessionId: string) {
    return this.http.post<PulseSubmitResponse>(`${API}/${sessionId}/submit`, {});
  }
}
