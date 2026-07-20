import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OrgOrderService } from '../../../core/services/org-order.service';
import { EmployeeRow, RowError } from '../../../core/models/org-order.models';

@Component({
  selector: 'app-buy-org-form',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './buy-org-form.component.html'
})
export class BuyOrgFormComponent implements OnInit {
  private orgOrders = inject(OrgOrderService);
  private router = inject(Router);

  orderId = signal<string | null>(null);
  rows = signal<EmployeeRow[]>([{ name: '', email: '', mobile: '', level: 'L' }]);
  csvNotice = signal(false);
  loading = signal(true);
  submitting = signal(false);
  error = signal('');
  rowErrors = signal<RowError[]>([]);

  ngOnInit() {
    this.orgOrders.createOrGetOrder().subscribe({
      next: res => {
        this.orderId.set(res.order.id);
        if (res.employees.length > 0) {
          this.rows.set(res.employees.map(e => ({
            name: e.name, email: e.email, mobile: e.mobile ?? '', level: e.level
          })));
        }
        this.loading.set(false);
      },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  addRow() {
    this.rows.update(r => [...r, { name: '', email: '', mobile: '', level: 'L' }]);
  }

  updateRow(i: number, field: keyof EmployeeRow, value: string) {
    this.rows.update(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  rowError(i: number): string | null {
    return this.rowErrors().find(e => e.index === i + 1)?.message ?? null;
  }

  onCsvSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.parseCsv(String(reader.result ?? ''));
    reader.readAsText(file);
    input.value = '';
  }

  private parseCsv(text: string) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    let dataLines = lines;
    const firstCell = lines[0].split(',')[0]?.trim();
    if (firstCell && isNaN(Number(firstCell))) dataLines = lines.slice(1); // header row present

    const parsed: EmployeeRow[] = dataLines.map(line => {
      const cols = line.split(',').map(c => c.trim());
      return {
        name: cols[1] ?? '',
        email: cols[2] ?? '',
        mobile: cols[3] ?? '',
        level: (cols[4] ?? 'L').toUpperCase()
      };
    });

    this.rows.set(parsed);
    this.csvNotice.set(true);
  }

  submit() {
    const id = this.orderId();
    if (!id) return;
    this.submitting.set(true);
    this.error.set('');
    this.rowErrors.set([]);
    this.orgOrders.setEmployees(id, this.rows()).subscribe({
      next: () => this.router.navigate(['/pricing/agreement-org', id]),
      error: (e: any) => {
        this.submitting.set(false);
        if (e?.error?.rowErrors) this.rowErrors.set(e.error.rowErrors);
        else this.error.set(this.msg(e));
      }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
