import { Order } from './order.models';

export interface CandidateRow {
  name: string;
  dob: string;        // yyyy-MM-dd
  email: string;
  mobileCc: string;
  mobile: string;
  assessmentStartDate: string; // yyyy-MM-dd
}

export interface RowError {
  index: number;
  message: string;
}

export interface HrCandidateResultSummary {
  assessmentId: number;
  assessmentName: string;
  completed: boolean;
  overallScore: number | null;
}

export interface HrCandidateDto {
  id: string;
  orderId: string;
  name: string;
  dob: string;
  email: string;
  mobile: string;
  assessmentStartDate: string;
  status: 'PENDING' | 'SENT' | 'ACCESSED' | 'EXPIRED' | 'REALLOCATED';
  tokenExpiresAt: string | null;
  canRequestReallocation: boolean;
  canRequestRetake: boolean;
  results: HrCandidateResultSummary[];
}

export interface HrOrderResponse {
  order: Order;
  selectedAssessmentNames: string[];
  candidates: HrCandidateDto[];
}

export interface HrCandidateTokenInfo {
  candidateName: string;
  assessmentNames: string[];
  termsAccepted: boolean;
}

export interface ReallocationRequest {
  newName: string;
  newDob: string;
  newEmail: string;
  newMobile: string;
}
