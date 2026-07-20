import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrgOrderService } from '../../../core/services/org-order.service';
import { OrgOrderResponse } from '../../../core/models/org-order.models';
import { OrgMonitorResponse, OrgReportResponse, Rag } from '../../../core/models/org-report.models';
import { PulseCode } from '../../../core/models/pulse.models';

const PULSE_ORDER: PulseCode[] = ['LEADER_PULSE', 'TALENT_PULSE', 'SYSTEM_PULSE', 'GROWTH_PULSE'];

const PULSE_LABELS: Record<PulseCode, string> = {
  LEADER_PULSE: 'LeaderPulse™',
  TALENT_PULSE: 'TalentPulse™',
  SYSTEM_PULSE: 'SystemPulse™',
  GROWTH_PULSE: 'GrowthPulse™'
};

const RAG_ORDER: Record<Rag, number> = { RED: 0, AMBER: 1, GREEN: 2, INSUFFICIENT_DATA: 3 };

@Component({
  selector: 'app-org-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class OrgDashboardComponent implements OnInit {
  private orgOrders = inject(OrgOrderService);

  loading = signal(true);
  error = signal('');
  order = signal<OrgOrderResponse | null>(null);
  monitor = signal<OrgMonitorResponse | null>(null);
  report = signal<OrgReportResponse | null>(null);

  pulseOrder = PULSE_ORDER;

  sortedSections = computed(() => {
    const r = this.report();
    if (!r) return [];
    return [...r.sections].sort((a, b) => RAG_ORDER[a.rag] - RAG_ORDER[b.rag]);
  });

  ngOnInit() {
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

  label(code: PulseCode) { return PULSE_LABELS[code]; }

  ragClass(rag: Rag) { return 'rag rag-' + rag.toLowerCase().replace(/_/g, '-'); }

  ragDialClass(rag: Rag) { return 'ragdial ragdial-' + rag.toLowerCase().replace(/_/g, '-'); }

  rowClass(rag: Rag) { return 'row-' + rag.toLowerCase().replace(/_/g, '-'); }

  ragLabel(rag: Rag) { return rag === 'INSUFFICIENT_DATA' ? 'Insufficient Data' : rag; }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
