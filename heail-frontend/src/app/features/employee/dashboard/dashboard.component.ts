import { Component, OnInit, signal, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { PulseService } from '../../../core/services/pulse.service';
import { PulseInfo, PulseCode } from '../../../core/models/pulse.models';

const PULSE_ORDER: PulseCode[] = ['LEADER_PULSE', 'TALENT_PULSE', 'SYSTEM_PULSE', 'GROWTH_PULSE'];

const PULSE_LABELS: Record<PulseCode, string> = {
  LEADER_PULSE: 'LeaderPulse™',
  TALENT_PULSE: 'TalentPulse™',
  SYSTEM_PULSE: 'SystemPulse™',
  GROWTH_PULSE: 'GrowthPulse™'
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

  loading = signal(true);
  starting = signal<PulseCode | null>(null);
  error = signal('');
  pulses = signal<PulseInfo[]>([]);
  allCompleted = signal(false);

  ngOnInit() {
    this.pulseService.status().subscribe({
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
    this.pulseService.start(pulse.pulseCode).subscribe({
      next: res => this.router.navigate(['/pulse/assessment', pulse.pulseCode, res.sessionId]),
      error: (e: any) => { this.starting.set(null); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
