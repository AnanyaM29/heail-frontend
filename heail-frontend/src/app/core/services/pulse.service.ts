import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StartAssessmentResponse, SessionResumeResponse, AnswerResponse } from '../models/assessment.models';
import { PulseStatusResponse, PulseSubmitResponse, PulseCode } from '../models/pulse.models';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/employee/pulse`;

@Injectable({ providedIn: 'root' })
export class PulseService {
  private http = inject(HttpClient);

  /** orderId picks which paid round to act on — the respondent's dashboard card
   *  carries the round's order id so "Continue" always lands on the round they
   *  clicked, not just whichever round the backend picked by default. */
  status(orderId?: string) {
    return this.http.get<PulseStatusResponse>(`${API}/status`, { params: orderId ? { orderId } : {} });
  }

  start(pulseCode: PulseCode, orderId?: string) {
    return this.http.post<StartAssessmentResponse>(`${API}/${pulseCode}/start`, {}, { params: orderId ? { orderId } : {} });
  }

  resume(sessionId: string) {
    return this.http.get<SessionResumeResponse>(`${API}/${sessionId}`);
  }

  answer(sessionId: string, questionId: string, selectedOption: string) {
    return this.http.post<AnswerResponse>(`${API}/${sessionId}/answer`, { questionId, selectedOption });
  }

  submit(sessionId: string, forced = false) {
    return this.http.post<PulseSubmitResponse>(`${API}/${sessionId}/submit`, {}, { params: { forced } });
  }
}
