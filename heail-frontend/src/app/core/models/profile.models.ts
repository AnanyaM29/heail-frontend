import { AuthResponse } from './auth.models';

export interface ProfileResponse {
  name: string;
  email: string;
  mobile: string | null;
  city: string | null;
  country: string | null;
  role: string;
}

export type ProfileOtpPurpose = 'CURRENT' | 'NEW_EMAIL' | 'NEW_MOBILE';

export interface ProfileOtpRequest {
  purpose: ProfileOtpPurpose;
  /** Only meaningful (and required) for NEW_EMAIL — the prospective new address. */
  target?: string;
}

export interface VerifyProfileOtpRequest {
  purpose: ProfileOtpPurpose;
  target?: string;
  otp: string;
}

export interface UpdateProfileRequest {
  name: string;
  city: string;
  country: string;
  email: string;
  mobile: string;
}

/** The save endpoint returns a full AuthResponse, not just the profile —
 *  see ProfileService.updateProfile on the backend for why. */
export type UpdateProfileResponse = AuthResponse;
