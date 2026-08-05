import { PulseCode } from './pulse.models';

export type Rag = 'RED' | 'AMBER' | 'GREEN' | 'INSUFFICIENT_DATA';
export type Band = 'emerging' | 'developing' | 'established' | 'leading';

export interface EmployeeProgress {
  id: string;
  name: string;
  email: string;
  invitationStatus: string;
  pulseStates: Record<PulseCode, 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'>;
  allCompleted: boolean;
}

export interface OrgMonitorResponse {
  orderId: string;
  totalEmployees: number;
  fullyCompletedCount: number;
  reportReleasedAt: string | null;
  employees: EmployeeProgress[];
}

export interface PulseRag {
  pulseCode: PulseCode;
  displayName: string;
  index: number;
  band: Band;
  rag: Rag;
  netGap: number | null;
  divergenceIndex: number | null;
  managementAlignment: number | null;
  consensus: number | null;
  polarisation: number | null;
  warning: string | null;
}

export interface SectionRag {
  sectionCode: string;
  sectionName: string;
  pulseCode: PulseCode;
  index: number;
  band: Band;
  rag: Rag;
  levelL: number | null;
  levelMM: number | null;
  levelE: number | null;
  gap: number | null;
  suppressedReason: string | null;
  sharedQuestionCount: number;
  respondentCount: number;
}

export interface QuestionFinding {
  questionId: string;
  sectionCode: string;
  sectionName: string;
  pulseCode: PulseCode;
  text: string;
  levelL: number | null;
  levelMM: number | null;
  levelE: number | null;
  gap: number;
  nL: number;
  nMM: number;
  nE: number;
}

export interface DataQuality {
  respondentsL: number;
  respondentsMM: number;
  respondentsE: number;
  sharedQuestions: number;
  straightliningCount: number;
  silenceRatePct: number;
  voiceConfidence: number;
  suppressedSectionCount: number;
  medianCompletionMinutes: number | null;
}

export interface RiskIndices {
  trustDeficit: number | null;
  executionDrag: number | null;
  attritionSignal: number | null;
  changeFatigue: number | null;
}

export interface OrgReportResponse {
  orderId: string;
  organisationName: string | null;
  releasedAt: string;
  respondentCount: number;
  totalEmployees: number;
  respondentsL: number;
  respondentsMM: number;
  respondentsE: number;
  overallIndex: number;
  overallBand: Band;
  overallRag: Rag;
  divergenceIndex: number | null;
  dataQuality: DataQuality;
  risk: RiskIndices;
  pulses: PulseRag[];
  sections: SectionRag[];
  findings: QuestionFinding[];
}
