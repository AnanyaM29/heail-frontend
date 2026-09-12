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
  /** Set when there's a live in-progress session for this pillar — stays set
   *  even after entitled flips to false (start() consumes the entitlement). */
  inProgressSessionId: string | null;
  /** When this pillar's entitlement was granted to the candidate — null if
   *  they were never entitled to it at all. */
  assignedAt: string | null;
}

export type HrAssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

/** One HR pillar assignment (entitlement) for the caller — one card per
 *  assignment, even when the same pillar was assigned to them more than once
 *  (e.g. registered as a candidate on two separate orders). */
export interface HrAssignment {
  entitlementId: string;
  assessmentId: number;
  assessmentCode: string;
  assessmentName: string;
  questionCount: number;
  timeMinutes: number;
  assignedAt: string;
  attemptNumber: number;
  status: HrAssignmentStatus;
  sessionId: string | null;
  timedOut: boolean;
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
