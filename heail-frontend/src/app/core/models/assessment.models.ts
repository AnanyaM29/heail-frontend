export interface Question {
  questionId: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export interface StartAssessmentResponse {
  sessionId: string;
  attemptNumber: number;
  questions: Question[];
}

export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface SessionResumeResponse {
  sessionId: string;
  attemptNumber: number;
  status: SessionStatus;
  questions: Question[];
  answeredOptions: Record<string, string>;
}

export interface AnswerResponse {
  questionId: string;
  selectedOption: string;
  answeredCount: number;
  totalQuestions: number;
}

export type LeaderBand = 'BEGINNING' | 'EMERGING' | 'DEVELOPING' | 'ADVANCED' | 'MASTER';

export interface LeaderResult {
  id: string;
  sessionId: string;
  attemptNumber: number;
  overallScore: number;
  band: LeaderBand;
  domainScores: Record<string, number>;
  strongestPrinciple: string | null;
  weakestPrinciple: string | null;
  createdAt: string;
}
