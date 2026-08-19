import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import {
  AuthResponse, AuthUser, LoginRequest,
  RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest
} from '../models/auth.models';
import { environment } from '../../../environments/environment';

const API = `${environment.apiBaseUrl}/api/v1/auth`;
const TOKEN_KEY = 'heail_access';
const REFRESH_KEY = 'heail_refresh';
const USER_KEY = 'heail_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<AuthUser | null>(this.loadUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly role = computed(() => this._user()?.role ?? null);

  login(req: LoginRequest) {
    return this.http.post<AuthResponse>(`${API}/login`, req).pipe(
      tap(res => this.persist(res))
    );
  }

  register(req: RegisterRequest) {
    return this.http.post<AuthResponse>(`${API}/register`, req).pipe(
      tap(res => this.persist(res))
    );
  }

  sendRegistrationOtp(email: string, mobile?: string) {
    return this.http.post<void>(`${API}/register/send-otp`, { email, mobile });
  }

  forgotPassword(req: ForgotPasswordRequest) {
    return this.http.post<void>(`${API}/forgot-password`, req);
  }

  resetPassword(req: ResetPasswordRequest) {
    return this.http.post<void>(`${API}/reset-password`, req);
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  getToken() { return localStorage.getItem(TOKEN_KEY); }

  /** Used after a profile update: the response is a full fresh AuthResponse
   *  (new tokens + user), since changing the email moves the JWT subject and
   *  the previously-held token would stop resolving to any user otherwise. */
  applyAuthResponse(res: AuthResponse) { this.persist(res); }

  routeByRole() {
    this.router.navigate([this.homePath()]);
  }

  homePath(): string {
    // Everyone lands on the unified /dashboard now — it aggregates
    // org-admin, respondent, and Leader activity for the account regardless
    // of which single role happens to be stored. Only SUPERADMIN is still
    // routed to its own console.
    switch (this._user()?.role) {
      case 'SUPERADMIN': return '/admin';
      case null:
      case undefined:     return '/login';
      default:            return '/dashboard';
    }
  }

  private persist(res: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this._user.set(res.user);
  }

  private loadUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
}
