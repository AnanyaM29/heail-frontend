import { OrgOrderResponse } from './org-order.models';
import { LeaderResult, SessionResumeResponse } from './assessment.models';
import { HrAssessment, HrResult, HrSessionResumeResponse } from './hr.models';

/** One organisation's pulse round the caller has been invited into as a
 *  respondent — separate from any round they might administer themselves. */
export interface RespondentMembership {
  orderId: string;
  organisationName: string;
  level: string;
  invitationStatus: string;
  orderStatus: string;
  paidAt: string | null;
  pulsesCompleted: number;
  pulsesTotal: number;
}

/** Everything the caller is doing across every HEAIL product, keyed off their
 *  single account rather than their stored role — mirrors DashboardResponse
 *  on the backend (DashboardController / DashboardService). */
export interface MyDashboard {
  email: string;
  name: string;
  organisationsAdministered: OrgOrderResponse[];
  leaderResults: LeaderResult[];
  leaderInProgress: SessionResumeResponse | null;
  leaderUnpaidOrder: boolean;
  /** Paid (or 100%-coupon) Leader purchase that hasn't been started yet. */
  leaderReadyToStart: boolean;
  respondentMemberships: RespondentMembership[];
  hrAssessments: HrAssessment[];
  hrResults: HrResult[];
  hrInProgress: HrSessionResumeResponse[];
}
