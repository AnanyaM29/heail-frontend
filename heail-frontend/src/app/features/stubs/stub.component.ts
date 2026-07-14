import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-stub',
  standalone: true,
  imports: [],
  template: `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--ivory);flex-direction:column;gap:24px;padding:40px">
      <div style="font-family:var(--disp);font-size:36px;color:var(--navy-deep)">{{ label }}</div>
      <div style="font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);font-weight:600">Under Construction · Phase Coming Soon</div>
      <div style="display:flex;gap:12px;margin-top:8px">
        <button class="btn btn-navy" (click)="auth.logout()">Sign Out</button>
      </div>
    </div>
  `
})
export class StubComponent {
  auth  = inject(AuthService);
  route = inject(ActivatedRoute);
  label = this.route.snapshot.data['label'] ?? 'Dashboard';
}
