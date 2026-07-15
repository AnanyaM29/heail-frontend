import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import {
  AuthResponse, AuthUser, LoginRequest,
  RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest
} from '../models/auth.models';

const API = 'http://localhost:8080/api/v1/auth';
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

  routeByRole() {
    this.router.navigate([this.homePath()]);
  }

  homePath(): string {
    switch (this._user()?.role) {
      case 'SUPERADMIN': return '/admin';
      case 'ORG_ADMIN':   return '/dashboard';
      case 'EMPLOYEE':    return '/pulse';
      case 'LEADER':      return '/leader';
      default:            return '/login';
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
