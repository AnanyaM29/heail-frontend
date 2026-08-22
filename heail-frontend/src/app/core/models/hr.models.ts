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

export interface HrResult {
  id: string;
  sessionId: string;
  assessmentId: number;
  assessmentCode: string;
  assessmentName: string;
  attemptNumber: number;
  overallScore: number;
  competencyScores: Record<string, number>;
  skillCategoryScores: Record<string, number>;
  strongestCompetency: string | null;
  strongestCompetencyName: string | null;
  weakestCompetency: string | null;
  weakestCompetencyName: string | null;
  createdAt: string;
}
