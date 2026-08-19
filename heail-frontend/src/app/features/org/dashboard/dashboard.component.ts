import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { OrgOrderService } from '../../../core/services/org-order.service';
import { OrgOrderResponse } from '../../../core/models/org-order.models';
import { OrgMonitorResponse, OrgReportResponse, SectionRag, Band } from '../../../core/models/org-report.models';
import { PulseCode } from '../../../core/models/pulse.models';

const PULSE_ORDER: PulseCode[] = ['LEADER_PULSE', 'TALENT_PULSE', 'SYSTEM_PULSE', 'GROWTH_PULSE'];

const PULSE_LABELS: Record<PulseCode, string> = {
  LEADER_PULSE: 'LeaderPulse',
  TALENT_PULSE: 'TalentPulse',
  SYSTEM_PULSE: 'SystemPulse',
  GROWTH_PULSE: 'GrowthPulse'
};

const BAND_LABELS: Record<Band, string> = {
  emerging: 'Emerging', developing: 'Developing', established: 'Established', leading: 'Leading'
};

const BAND_DEFINITIONS: Record<Band, string> = {
  emerging: 'Emerging (0–39) — early stage; foundational gaps still being addressed.',
  developing: 'Developing (40–59) — building capability; meaningful progress underway.',
  established: 'Established (60–79) — solid, consistent practice in place.',
  leading: 'Leading (80–100) — best-practice level, a model for others.'
};

type SortMode = 'gap' | 'score';

@Component({
  selector: 'app-org-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class OrgDashboardComponent implements OnInit {
  private orgOrders = inject(OrgOrderService);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  error = signal('');
  order = signal<OrgOrderResponse | null>(null);
  monitor = signal<OrgMonitorResponse | null>(null);
  report = signal<OrgReportResponse | null>(null);
  sortMode = signal<SortMode>('gap');

  pulseOrder = PULSE_ORDER;

  // The backend already sorts by |gap| desc, suppressed last — "sort by score"
  // is a client-side-only alternate view, since score isn't a scope the API
  // needs to care about ordering by.
  sortedSections = computed(() => {
    const r = this.report();
    if (!r) return [];
    if (this.sortMode() === 'score') return [...r.sections].sort((a, b) => a.index - b.index);
    return r.sections;
  });

  ngOnInit() {
    // Arriving from a specific card on /dashboard (?order=<id>) always shows
    // that exact order — otherwise two rounds (e.g. one PAID, one still stuck
    // at AGREEMENT_ACCEPTED from an old testing session) would both open the
    // same "first PAID order" and look like the same assessment either way.
    const requestedId = this.route.snapshot.queryParamMap.get('order');

    if (requestedId) {
      this.orgOrders.getOrder(requestedId).subscribe({
        next: o => { this.order.set(o); this.loadMonitor(o.order.id); },
        error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
      });
      return;
    }

    this.orgOrders.listMyOrders().subscribe({
      next: orders => {
        const paid = orders.find(o => o.order.status === 'PAID');
        if (!paid) { this.loading.set(false); return; }
        this.order.set(paid);
        this.loadMonitor(paid.order.id);
      },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  private loadMonitor(orderId: string) {
    this.orgOrders.getMonitor(orderId).subscribe({
      next: res => {
        this.monitor.set(res);
        if (res.reportReleasedAt) this.loadReport(orderId);
        else this.loading.set(false);
      },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  private loadReport(orderId: string) {
    this.orgOrders.getReport(orderId).subscribe({
      next: res => { this.report.set(res); this.loading.set(false); },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  setSort(mode: SortMode) { this.sortMode.set(mode); }

  label(code: PulseCode) { return PULSE_LABELS[code]; }
  bandLabel(band: Band) { return BAND_LABELS[band]; }
  bandTitle(band: Band) { return BAND_DEFINITIONS[band]; }

  /** Position (0-100) along the spine track for a level dot / gap span. */
  pct(v: number | null): number { return v == null ? 0 : Math.max(0, Math.min(100, v)); }

  isHotGap(gap: number | null): boolean { return gap != null && Math.abs(gap) >= 20; }

  /** Left edge (%) of the gap span between whichever of L/E sits lower. */
  spineTrackLeft(s: SectionRag): number {
    if (s.levelL == null || s.levelE == null) return 0;
    return this.pct(Math.min(s.levelL, s.levelE));
  }

  /** Width (%) of the gap span — the visual length that IS the disagreement. */
  spineTrackWidth(s: SectionRag): number {
    return s.gap == null ? 0 : this.pct(Math.abs(s.gap));
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
