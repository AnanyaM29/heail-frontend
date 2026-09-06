export interface HrQuestion {
  questionId: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
}

export interface HrAssessment {
  id: number;
  code: string;
  name: string;
  questionCount: number;
  timeMinutes: number;
  entitled: boolean;
}

export interface HrStartAssessmentResponse {
  sessionId: string;
  attemptNumber: number;
  questions: HrQuestion[];
  deadlineAt: string | null;
}

export type HrSessionStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface HrSessionResumeResponse {
  sessionId: string;
  assessmentId: number;
  assessmentName: string;
  attemptNumber: number;
  status: HrSessionStatus;
  questions: HrQuestion[];
  answeredOptions: Record<string, string>;
  deadlineAt: string | null;
}

/** A test-taker's view of one HR attempt. HR results are shown only to the
 *  buyer, so for the person who took the test every score field below is null —
 *  they see the record (assessment, attempt, date), not the outcome. */
export interface HrResult {
  id: string;
  sessionId: string;
  assessmentId: number;
  assessmentCode: string;
  assessmentName: string;
  attemptNumber: number;
  overallScore: number | null;
  competencyScores: Record<string, number> | null;
  skillCategoryScores: Record<string, number> | null;
  strongestCompetency: string | null;
  strongestCompetencyName: string | null;
  weakestCompetency: string | null;
  weakestCompetencyName: string | null;
  /** True when the attempt ended because the time limit was reached rather than
   *  finished. Shown to the taker too — it's a status, not a score. */
  timedOut: boolean;
  createdAt: string;
}
