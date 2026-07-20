import { PulseCode } from './pulse.models';

export type Rag = 'RED' | 'AMBER' | 'GREEN' | 'INSUFFICIENT_DATA';

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
  rag: Rag;
  avgScore: number | null;
}

export interface SectionRag {
  sectionCode: string;
  sectionName: string;
  rag: Rag;
  avgScore: number | null;
  respondentCount: number;
}

export interface OrgReportResponse {
  orderId: string;
  releasedAt: string;
  respondentCount: number;
  totalEmployees: number;
  overallRag: Rag;
  pulses: PulseRag[];
  sections: SectionRag[];
}
