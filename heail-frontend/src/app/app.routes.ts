import { Routes } from '@angular/router';
import { guestGuard, authGuard, leaderGuard } from './core/guards/auth.guard';
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
      { path: 'for-leaders/foundation', loadComponent: () => import('./features/website/gita/gita.component').then(m => m.GitaComponent) },
      { path: 'for-hr',            loadComponent: () => import('./features/website/hr/hr.component').then(m => m.HrComponent) },
      { path: 'for-students',      loadComponent: () => import('./features/website/students/students.component').then(m => m.StudentsComponent) },
      { path: 'transformation',    loadComponent: () => import('./features/website/transformation/transformation.component').then(m => m.TransformationComponent) },
      { path: 'tests',             loadComponent: () => import('./features/website/tests/tests.component').then(m => m.TestsComponent) },
      { path: 'pricing',           loadComponent: () => import('./features/website/pricing/pricing.component').then(m => m.PricingComponent) },
      { path: 'pricing/buy-leader', canActivate: [authGuard], loadComponent: () => import('./features/leader/payment/payment.component').then(m => m.LeaderPaymentComponent) },
      { path: 'pricing/buy-org',         loadComponent: () => import('./features/website/buy-org/buy-org.component').then(m => m.BuyOrgComponent) },
      { path: 'pricing/buy-org-form',    loadComponent: () => import('./features/website/buy-org/buy-org-form.component').then(m => m.BuyOrgFormComponent) },
      { path: 'pricing/agreement-org',   loadComponent: () => import('./features/website/buy-org/agreement-org.component').then(m => m.AgreementOrgComponent) },
      { path: 'partners',          loadComponent: () => import('./features/website/partners/partners.component').then(m => m.PartnersComponent) },
      { path: 'foundation',        loadComponent: () => import('./features/website/foundation/foundation.component').then(m => m.FoundationComponent) },
      { path: 'contact',           loadComponent: () => import('./features/website/contact/contact.component').then(m => m.ContactComponent) },
      { path: 'privacy',           loadComponent: () => import('./features/website/privacy/privacy.component').then(m => m.PrivacyComponent) },
      { path: 'terms',             loadComponent: () => import('./features/website/terms/terms.component').then(m => m.TermsComponent) },

      /* ── Protected app stubs (inside layout) ── */
      { path: 'admin',     canActivate: [authGuard], loadComponent: () => import('./features/stubs/stub.component').then(m => m.StubComponent), data: { label: 'Superadmin Console' } },
      { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./features/stubs/stub.component').then(m => m.StubComponent), data: { label: 'Organisation Dashboard' } },
      { path: 'pulse',     canActivate: [authGuard], loadComponent: () => import('./features/stubs/stub.component').then(m => m.StubComponent), data: { label: 'Employee Pulse Checklist' } },
      { path: 'leader',    canActivate: [authGuard, leaderGuard], loadComponent: () => import('./features/leader/dashboard/dashboard.component').then(m => m.LeaderDashboardComponent) },
      { path: 'leader/assessment/:sessionId', canActivate: [authGuard, leaderGuard], loadComponent: () => import('./features/leader/assessment/player.component').then(m => m.AssessmentPlayerComponent) },
    ]
  },

  /* ── Auth (full-screen, no nav/footer) ── */
  { path: 'login',           canActivate: [guestGuard], loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'register',        canActivate: [guestGuard], loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'forgot-password', canActivate: [guestGuard], loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'reset-password',  loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },

  { path: '**', redirectTo: '' }
];
