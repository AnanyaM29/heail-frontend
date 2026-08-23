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
  newStartDate: string;
}

export interface HrCandidateRequestDto {
  id: string;
  type: 'REALLOCATION' | 'RETAKE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  newName: string | null;
  newDob: string | null;
  newEmail: string | null;
  newMobile: string | null;
  newStartDate: string | null;
  createdAt: string;
}
