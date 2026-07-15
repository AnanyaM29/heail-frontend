import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface EmployeeRow {
  name: string;
  email: string;
  mobile: string;
  level: 'Leader' | 'Middle Management' | 'Executive';
}

@Component({
  selector: 'app-buy-org-form',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './buy-org-form.component.html'
})
export class BuyOrgFormComponent {
  rows = signal<EmployeeRow[]>([{ name: '', email: '', mobile: '', level: 'Leader' }]);
  csvNotice = signal(false);

  addRow() {
    this.rows.update(r => [...r, { name: '', email: '', mobile: '', level: 'Leader' }]);
  }

  updateRow(i: number, field: keyof EmployeeRow, value: string) {
    this.rows.update(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  uploadCsv() {
    this.csvNotice.set(true);
  }
}
