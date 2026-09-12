import { Component, OnInit, signal, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PulseService } from '../../../core/services/pulse.service';
import { PulseInfo, PulseCode } from '../../../core/models/pulse.models';
import { FRESH_AUTH_KEY } from '../../../core/guards/auth.guard';

const PULSE_ORDER: PulseCode[] = ['LEADER_PULSE', 'TALENT_PULSE', 'SYSTEM_PULSE', 'GROWTH_PULSE'];

const PULSE_LABELS: Record<PulseCode, string> = {
  LEADER_PULSE: 'LeaderPulse',
  TALENT_PULSE: 'TalentPulse',
  SYSTEM_PULSE: 'SystemPulse',
  GROWTH_PULSE: 'GrowthPulse'
};

const PULSE_DESCRIPTIONS: Record<PulseCode, string> = {
  LEADER_PULSE: 'Leadership style, integrity, empathy, coordination, culture & deep blockers',
  TALENT_PULSE: 'Happiness, hiring, performance, learning & AI adoption, attrition',
  SYSTEM_PULSE: 'Revenue execution, brand position, technology, pay equity, compliance',
  GROWTH_PULSE: 'Growth strategy, future readiness, motivational climate, customer experience, readiness & intent'
};

@Component({
  selector: 'app-pulse-dashboard',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class PulseDashboardComponent implements OnInit {
  private pulseService = inject(PulseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  starting = signal<PulseCode | null>(null);
  error = signal('');
  pulses = signal<PulseInfo[]>([]);
  allCompleted = signal(false);

  /** Which round to show — carried from the specific card clicked on the
   *  dashboard (?order=<id>). Falls back to the account's most recently paid
   *  round when arriving without one (bare /pulse entry, take-test links). */
  private orderId: string | null = null;

  ngOnInit() {
    this.orderId = this.route.snapshot.queryParamMap.get('order');
    this.pulseService.status(this.orderId ?? undefined).subscribe({
      next: res => {
        this.pulses.set(res.pulses);
        this.allCompleted.set(res.allCompleted);
        this.loading.set(false);
      },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  label(code: PulseCode) { return PULSE_LABELS[code]; }
  description(code: PulseCode) { return PULSE_DESCRIPTIONS[code]; }
  initial(code: PulseCode) { return PULSE_LABELS[code].charAt(0); }

  previousLabel(pulse: PulseInfo): string {
    const idx = PULSE_ORDER.indexOf(pulse.pulseCode);
    return idx > 0 ? PULSE_LABELS[PULSE_ORDER[idx - 1]] : '';
  }

  beginOrResume(pulse: PulseInfo) {
    if (pulse.state !== 'PENDING' && pulse.state !== 'IN_PROGRESS') return;
    this.starting.set(pulse.pulseCode);
    this.error.set('');
    // In-app launch by a signed-in respondent — mark fresh-auth BEFORE opening
    // the popup so it inherits the marker (sessionStorage is cloned into the new
    // window at open time) and assessmentEntryGuard admits it without a /login
    // bounce. Email links still force re-login via /take-test/:dest.
    try { sessionStorage.setItem(FRESH_AUTH_KEY, '1'); } catch {}
    // Opens in a new window on purpose — a timed, locked-down test window
    // separate from the browsable main site (see testExitGuard/beforeunload
    // in PulsePlayerComponent). Must call window.open() synchronously, inside
    // this click handler, or browsers treat it as an unrequested popup and
    // block it — the target URL isn't known yet, so open blank and redirect
    // it once the session-start call comes back.
    const testWindow = window.open('', '_blank');
    this.pulseService.start(pulse.pulseCode, this.orderId ?? undefined).subscribe({
      next: res => {
        this.starting.set(null);
        const url = this.router.createUrlTree(['/pulse/assessment', pulse.pulseCode, res.sessionId]).toString();
        if (testWindow) testWindow.location.href = url; else window.open(url, '_blank');
      },
      error: (e: any) => { this.starting.set(null); this.error.set(this.msg(e)); testWindow?.close(); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
