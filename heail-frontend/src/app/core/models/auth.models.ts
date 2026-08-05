export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  city: string;
  country: string;
  mobile: string;
  otp: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPERADMIN' | 'ORG_ADMIN' | 'EMPLOYEE' | 'LEADER';
  respondentLevel?: string;
  organisationId?: string;
  organisationName?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}
