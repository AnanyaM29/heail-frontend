import { Routes } from '@angular/router';
import { guestGuard, authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [

  /* ── Public website (with nav + footer) ── */
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./features/website/home/home.component').then(m => m.HomeComponent) },
      { path: 'for-organisations', loadComponent: () => import('./features/website/org/org.component').then(m => m.OrgComponent) },
      { path: 'for-leaders',       loadComponent: () => import('./features/website/leaders/leaders.component').then(m => m.LeadersComponent) },
      { path: 'for-hr',            loadComponent: () => import('./features/website/hr/hr.component').then(m => m.HrComponent) },
      { path: 'for-students',      loadComponent: () => import('./features/website/students/students.component').then(m => m.StudentsComponent) },
      { path: 'transformation',    loadComponent: () => import('./features/website/transformation/transformation.component').then(m => m.TransformationComponent) },
      { path: 'tests',             loadComponent: () => import('./features/website/tests/tests.component').then(m => m.TestsComponent) },
      { path: 'pricing',           loadComponent: () => import('./features/website/pricing/pricing.component').then(m => m.PricingComponent) },
      { path: 'partners',          loadComponent: () => import('./features/website/partners/partners.component').then(m => m.PartnersComponent) },
      { path: 'foundation',        loadComponent: () => import('./features/website/foundation/foundation.component').then(m => m.FoundationComponent) },
      { path: 'contact',           loadComponent: () => import('./features/website/contact/contact.component').then(m => m.ContactComponent) },
      { path: 'privacy',           loadComponent: () => import('./features/website/privacy/privacy.component').then(m => m.PrivacyComponent) },
      { path: 'terms',             loadComponent: () => import('./features/website/terms/terms.component').then(m => m.TermsComponent) },

      /* ── Protected app stubs (inside layout) ── */
      { path: 'admin',     canActivate: [authGuard], loadComponent: () => import('./features/stubs/stub.component').then(m => m.StubComponent), data: { label: 'Superadmin Console' } },
      { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./features/stubs/stub.component').then(m => m.StubComponent), data: { label: 'Organisation Dashboard' } },
      { path: 'pulse',     canActivate: [authGuard], loadComponent: () => import('./features/stubs/stub.component').then(m => m.StubComponent), data: { label: 'Employee Pulse Checklist' } },
      { path: 'leader',    canActivate: [authGuard], loadComponent: () => import('./features/stubs/stub.component').then(m => m.StubComponent), data: { label: 'Leader Dashboard' } },
    ]
  },

  /* ── Auth (full-screen, no nav/footer) ── */
  { path: 'login',           canActivate: [guestGuard], loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'register',        canActivate: [guestGuard], loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'forgot-password', canActivate: [guestGuard], loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'reset-password',  loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },

  { path: '**', redirectTo: '' }
];
