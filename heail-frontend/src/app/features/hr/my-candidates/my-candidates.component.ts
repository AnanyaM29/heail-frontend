import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HrOrderService } from '../../../core/services/hr-order.service';
import { HrCandidateDto } from '../../../core/models/hr-candidate.models';

/** Buyer-facing tracking view — every candidate ever registered across every
 *  paid HR order, their invite status, and results once completed. Reached
 *  from the payment thank-you page and the dashboard.
 *
 *  "Retake" is a self-service paid action — it spins up a fresh single-candidate
 *  order for the SAME person and same pillars and routes into the normal payment
 *  flow. Reallocation to a different person is deliberately not offered: an
 *  assessment stays tied to whoever the buyer originally registered. */
@Component({
  selector: 'app-my-candidates',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './my-candidates.component.html',
  styleUrl: './my-candidates.component.css'
})
export class MyCandidatesComponent implements OnInit {
  private hrOrders = inject(HrOrderService);
  private router = inject(Router);

  loading = signal(true);
  error = signal('');
  candidates = signal<HrCandidateDto[]>([]);

  actionBusy = signal<string | null>(null);
  actionMessage = signal('');

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.hrOrders.listMyCandidates().subscribe({
      next: rows => { this.candidates.set(rows); this.loading.set(false); },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  /** What the buyer sees on the status pill. The invite-lifecycle enum on the
   *  candidate row stops at ACCESSED ("clicked the link") — it never flips to a
   *  done state — so completion and timeout are read off the actual results. */
  displayStatus(c: HrCandidateDto): string {
    if (c.results?.some(r => r.timedOut)) return 'Timed Out';
    if (c.results?.some(r => r.completed)) return 'Completed';
    return this.statusLabel(c.status);
  }

  isDone(c: HrCandidateDto): boolean {
    return !!c.results?.some(r => r.completed || r.timedOut);
  }

  isTimedOut(c: HrCandidateDto): boolean {
    return !!c.results?.some(r => r.timedOut);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'Processing';
      case 'SENT': return 'Invited — not started';
      case 'ACCESSED': return 'In progress / started';
      case 'EXPIRED': return 'Link expired';
      case 'REALLOCATED': return 'Reallocated';
      default: return status;
    }
  }

  retake(candidateId: string) {
    this.actionBusy.set(candidateId);
    this.actionMessage.set('');
    this.hrOrders.createRetakeOrder(candidateId).subscribe({
      next: order => this.router.navigate(['/pricing/buy-hr', order.id]),
      error: (e: any) => { this.actionBusy.set(null); this.actionMessage.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
