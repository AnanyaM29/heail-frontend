export interface AdminTestSession {
  id: string;
  userName: string;
  userEmail: string;
  organisationName: string | null;
  productCode: string;
  pulse: string | null;
  status: string;
  attemptNumber: number;
  startedAt: string;
  completedAt: string | null;
}

export interface AdminPayment {
  id: string;
  userName: string;
  userEmail: string;
  productCode: string;
  status: string;
  currency: string;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  gatewayOrderRef: string | null;
  invoiceNumber: string | null;
  draftAt: string;
  paidAt: string | null;
}

export interface AdminPartner {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  mobile: string | null;
  email: string;
  consentGiven: boolean;
  resumeFileName: string | null;
  hasResume: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  city: string | null;
  country: string | null;
  organisationName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  active: boolean;
  blacklistedAt: string | null;
  deletedAt: string | null;
}
